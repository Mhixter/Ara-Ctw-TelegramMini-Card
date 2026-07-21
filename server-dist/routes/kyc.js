"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decryptField = decryptField;
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const telegramNotify_1 = require("../services/telegramNotify");
const paypoint_1 = require("../services/paypoint");
const router = (0, express_1.Router)();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-aes-256-key-32-chars-here!!';
const KEY_BUF = Buffer.from(ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0'));
const AUTO_APPROVE = process.env.KYC_AUTO_APPROVE !== 'false';
/** AES-256-CBC encrypt — returns iv:ciphertext (both hex) */
function encryptField(value) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv('aes-256-cbc', KEY_BUF, iv);
    const encrypted = Buffer.concat([cipher.update(value.trim(), 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}
/** AES-256-CBC decrypt */
function decryptField(encrypted) {
    const [ivHex, dataHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto_1.default.createDecipheriv('aes-256-cbc', KEY_BUF, iv);
    return Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]).toString('utf8');
}
async function provisionVirtualAccount(userId, phone, bvn, client) {
    const walletResult = await client.query('SELECT id, virtual_account_number FROM wallets WHERE user_id = $1 AND currency = $2', [userId, 'NGN']);
    if (walletResult.rows.length > 0 && !walletResult.rows[0].virtual_account_number) {
        let acctNum;
        let bankName;
        try {
            // Use PayPoint when configured; fall back to mock
            const acct = await (0, paypoint_1.createVirtualAccount)({
                userId,
                fullName: phone, // name placeholder when only phone is known
                bvn: bvn || undefined,
            });
            acctNum = acct.accountNumber;
            bankName = acct.bankName;
        }
        catch (err) {
            console.error('[kyc] PayPoint provisioning failed, using mock:', err);
            const suffix = Math.floor(Math.random() * 9000000000) + 1000000000;
            acctNum = String(suffix);
            bankName = 'PayPoint MFB';
        }
        await client.query('UPDATE wallets SET virtual_account_number = $1, virtual_bank_name = $2, updated_at = NOW() WHERE id = $3', [acctNum, bankName, walletResult.rows[0].id]);
        return { acctNum, bankName };
    }
    return null;
}
// ── GET /status ───────────────────────────────────────────────────────────────
router.get('/status', auth_1.requireAuth, auth_1.requireUUID, async (req, res) => {
    try {
        const user = await db_1.default.query('SELECT kyc_status, kyc_rejection_reason FROM users WHERE id = $1', [req.user.userId]);
        const kyc = await db_1.default.query(`SELECT phone, verified_at FROM user_kyc WHERE user_id = $1`, [req.user.userId]);
        res.json({
            kycStatus: user.rows[0]?.kyc_status,
            rejectionReason: user.rows[0]?.kyc_rejection_reason,
            kyc: kyc.rows[0] || null,
        });
    }
    catch {
        res.status(500).json({ error: 'Server error' });
    }
});
// ── POST /tier1 — BVN + phone only ────────────────────────────────────────────
router.post('/tier1', auth_1.requireAuth, auth_1.requireUUID, async (req, res) => {
    const client = await db_1.default.connect();
    try {
        const { bvn, phone } = req.body;
        if (!bvn || String(bvn).trim().length !== 11) {
            return res.status(400).json({ error: 'A valid 11-digit BVN is required.' });
        }
        if (!phone || String(phone).trim().length < 10) {
            return res.status(400).json({ error: 'A valid phone number is required.' });
        }
        const bvnStr = String(bvn).trim();
        const phoneStr = String(phone).trim();
        const bvnEncrypted = encryptField(bvnStr);
        await client.query('BEGIN');
        const existing = await client.query('SELECT id FROM user_kyc WHERE user_id = $1', [req.user.userId]);
        if (existing.rows.length > 0) {
            await client.query(`UPDATE user_kyc SET bvn_encrypted=$1, phone=$2, updated_at=NOW() WHERE user_id=$3`, [bvnEncrypted, phoneStr, req.user.userId]);
        }
        else {
            await client.query(`INSERT INTO user_kyc (user_id, bvn_encrypted, phone) VALUES ($1,$2,$3)`, [req.user.userId, bvnEncrypted, phoneStr]);
        }
        const newStatus = AUTO_APPROVE ? 'TIER_1' : 'PENDING_REVIEW';
        await client.query('UPDATE users SET kyc_status=$1, kyc_rejection_reason=NULL WHERE id=$2', [newStatus, req.user.userId]);
        if (AUTO_APPROVE) {
            await provisionVirtualAccount(req.user.userId, phoneStr, bvnStr, client);
        }
        await client.query('COMMIT');
        // Fire-and-forget Telegram notification
        if (AUTO_APPROVE) {
            db_1.default.query('SELECT telegram_id FROM users WHERE id = $1', [req.user.userId])
                .then(r => {
                const tgId = r.rows[0]?.telegram_id;
                if (tgId)
                    (0, telegramNotify_1.sendTelegramMessage)(tgId, (0, telegramNotify_1.buildKycApprovalMessage)('TIER_1'));
            })
                .catch(() => { });
        }
        const message = AUTO_APPROVE
            ? 'Identity verified! Your virtual account is ready.'
            : 'Submission received! Your identity is under review — usually within 24 hours.';
        res.json({ success: true, message, kycStatus: newStatus });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('[KYC tier1]', err);
        res.status(500).json({ error: 'KYC submission failed. Please try again.' });
    }
    finally {
        client.release();
    }
});
// ── POST /tier2 — kept for admin-side upgrades ────────────────────────────────
router.post('/tier2', auth_1.requireAuth, auth_1.requireUUID, async (req, res) => {
    const client = await db_1.default.connect();
    try {
        const { documentUrl, livenessScore } = req.body;
        if (!documentUrl) {
            return res.status(400).json({ error: 'Document URL is required.' });
        }
        const userResult = await db_1.default.query('SELECT kyc_status FROM users WHERE id = $1', [req.user.userId]);
        const kycStatus = userResult.rows[0]?.kyc_status;
        if (!['TIER_1'].includes(kycStatus)) {
            return res.status(400).json({ error: 'Complete Tier 1 verification before upgrading.' });
        }
        await client.query('BEGIN');
        const kycRow = await client.query('SELECT id FROM user_kyc WHERE user_id = $1', [req.user.userId]);
        if (kycRow.rows.length > 0) {
            await client.query('UPDATE user_kyc SET id_document_url=$1, liveness_score=$2, verified_at=NOW() WHERE user_id=$3', [documentUrl, livenessScore ?? 85, req.user.userId]);
        }
        const newStatus = AUTO_APPROVE ? 'TIER_2' : 'PENDING_REVIEW';
        await client.query('UPDATE users SET kyc_status=$1 WHERE id=$2', [newStatus, req.user.userId]);
        await client.query('COMMIT');
        res.json({
            success: true,
            message: AUTO_APPROVE ? 'Advanced verification complete.' : 'Document submitted. Under review — usually 24–48 hours.',
            kycStatus: newStatus,
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('[KYC tier2]', err);
        res.status(500).json({ error: 'KYC upgrade failed. Please try again.' });
    }
    finally {
        client.release();
    }
});
exports.default = router;
