"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const telegramNotify_1 = require("../services/telegramNotify");
async function provisionVirtualAccount(userId, client) {
    const walletResult = await client.query('SELECT id, virtual_account_number FROM wallets WHERE user_id = $1 AND currency = $2', [userId, 'NGN']);
    if (walletResult.rows.length > 0 && !walletResult.rows[0].virtual_account_number) {
        const acctNum = `${Math.floor(Math.random() * 9000000000) + 1000000000}`;
        const banks = ['Wema Bank', 'Sterling Bank', 'Moniepoint', 'Providus Bank', 'Kuda Bank'];
        const bankName = banks[Math.floor(Math.random() * banks.length)];
        await client.query('UPDATE wallets SET virtual_account_number = $1, virtual_bank_name = $2, updated_at = NOW() WHERE id = $3', [acctNum, bankName, walletResult.rows[0].id]);
    }
}
const router = (0, express_1.Router)();
router.get('/users', auth_1.requireAdmin, (0, auth_1.requireRole)('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'CUSTOMER_SUPPORT'), async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', kycStatus = '' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let query = `SELECT u.*, uk.full_name, uk.liveness_score, uk.verified_at, uk.country, uk.id_type
                 FROM users u LEFT JOIN user_kyc uk ON u.id = uk.user_id WHERE 1=1`;
        const params = [];
        if (kycStatus) {
            params.push(kycStatus);
            query += ` AND u.kyc_status = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (uk.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
        }
        params.push(Number(limit), offset);
        query += ` ORDER BY u.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
        const result = await db_1.default.query(query, params);
        const countResult = await db_1.default.query('SELECT COUNT(*) FROM users');
        res.json({ users: result.rows, total: parseInt(countResult.rows[0].count) });
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});
router.get('/users/:userId', auth_1.requireAdmin, (0, auth_1.requireRole)('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'CUSTOMER_SUPPORT'), async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await db_1.default.query(`SELECT u.*, uk.full_name, uk.date_of_birth, uk.liveness_score, uk.id_document_url,
              uk.verified_at, uk.country, uk.id_type
       FROM users u LEFT JOIN user_kyc uk ON u.id = uk.user_id WHERE u.id = $1`, [userId]);
        if (!user.rows.length)
            return res.status(404).json({ error: 'User not found' });
        const wallets = await db_1.default.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
        const cards = await db_1.default.query('SELECT id, mask_pan, card_tier, card_brand, card_currency, daily_limit, monthly_limit, status FROM cards WHERE user_id = $1', [userId]);
        res.json({ user: user.rows[0], wallets: wallets.rows, cards: cards.rows });
    }
    catch {
        res.status(500).json({ error: 'Server error' });
    }
});
router.patch('/users/:userId/kyc', auth_1.requireAdmin, (0, auth_1.requireRole)('SUPER_ADMIN', 'COMPLIANCE_OFFICER'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { kycStatus } = req.body;
        if (!['PENDING', 'PENDING_REVIEW', 'TIER_1', 'TIER_2', 'BANNED'].includes(kycStatus)) {
            return res.status(400).json({ error: 'Invalid KYC status' });
        }
        const result = await db_1.default.query('UPDATE users SET kyc_status = $1 WHERE id = $2 RETURNING id, kyc_status', [kycStatus, userId]);
        if (!result.rows.length)
            return res.status(404).json({ error: 'User not found' });
        res.json({ success: true, user: result.rows[0] });
    }
    catch {
        res.status(500).json({ error: 'Server error' });
    }
});
router.get('/kyc/queue', auth_1.requireAdmin, (0, auth_1.requireRole)('SUPER_ADMIN', 'COMPLIANCE_OFFICER'), async (req, res) => {
    try {
        const result = await db_1.default.query(`SELECT u.id, u.email, u.kyc_status, u.created_at,
              uk.full_name, uk.date_of_birth, uk.country, uk.id_type,
              uk.id_document_url, uk.liveness_score, uk.verified_at
       FROM users u
       LEFT JOIN user_kyc uk ON u.id = uk.user_id
       WHERE u.kyc_status = 'PENDING_REVIEW'
       ORDER BY u.updated_at ASC`);
        res.json({ queue: result.rows, total: result.rowCount });
    }
    catch {
        res.status(500).json({ error: 'Server error' });
    }
});
router.post('/kyc/:userId/approve', auth_1.requireAdmin, (0, auth_1.requireRole)('SUPER_ADMIN', 'COMPLIANCE_OFFICER'), async (req, res) => {
    const client = await db_1.default.connect();
    try {
        const { userId } = req.params;
        const { tier = 'TIER_1' } = req.body;
        if (!['TIER_1', 'TIER_2'].includes(tier)) {
            return res.status(400).json({ error: 'Invalid tier. Must be TIER_1 or TIER_2.' });
        }
        await client.query('BEGIN');
        const userResult = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (!userResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'User not found' });
        }
        await client.query(`UPDATE users SET kyc_status=$1, kyc_rejection_reason=NULL, updated_at=NOW() WHERE id=$2`, [tier, userId]);
        if (tier === 'TIER_1') {
            await provisionVirtualAccount(String(userId), client);
        }
        if (tier === 'TIER_2') {
            await client.query('UPDATE user_kyc SET verified_at=NOW() WHERE user_id=$1 AND verified_at IS NULL', [userId]);
        }
        await client.query('COMMIT');
        // Fire-and-forget Telegram notification
        db_1.default.query('SELECT telegram_id FROM users WHERE id = $1', [userId])
            .then(r => {
            const tgId = r.rows[0]?.telegram_id;
            if (tgId)
                (0, telegramNotify_1.sendTelegramMessage)(tgId, (0, telegramNotify_1.buildKycApprovalMessage)(tier));
        })
            .catch(() => { });
        res.json({ success: true, message: `User approved as ${tier}`, kycStatus: tier });
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('[admin kyc approve]', err);
        res.status(500).json({ error: 'Approval failed' });
    }
    finally {
        client.release();
    }
});
router.post('/kyc/:userId/reject', auth_1.requireAdmin, (0, auth_1.requireRole)('SUPER_ADMIN', 'COMPLIANCE_OFFICER'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason = 'Identity could not be verified. Please resubmit with valid documents.' } = req.body;
        const result = await db_1.default.query(`UPDATE users SET kyc_status='PENDING', kyc_rejection_reason=$1, updated_at=NOW()
       WHERE id=$2 RETURNING id, kyc_status`, [reason, userId]);
        if (!result.rows.length)
            return res.status(404).json({ error: 'User not found' });
        // Fire-and-forget Telegram notification
        db_1.default.query('SELECT telegram_id FROM users WHERE id = $1', [userId])
            .then(r => {
            const tgId = r.rows[0]?.telegram_id;
            if (tgId)
                (0, telegramNotify_1.sendTelegramMessage)(tgId, (0, telegramNotify_1.buildKycRejectionMessage)(reason));
        })
            .catch(() => { });
        res.json({ success: true, message: 'KYC rejected', user: result.rows[0] });
    }
    catch {
        res.status(500).json({ error: 'Server error' });
    }
});
router.patch('/cards/:cardId/freeze', auth_1.requireAdmin, (0, auth_1.requireRole)('SUPER_ADMIN', 'CUSTOMER_SUPPORT'), async (req, res) => {
    try {
        const { cardId } = req.params;
        const { status } = req.body;
        const result = await db_1.default.query('UPDATE cards SET status = $1 WHERE id = $2 RETURNING id, status', [status, cardId]);
        if (!result.rows.length)
            return res.status(404).json({ error: 'Card not found' });
        res.json({ success: true, card: result.rows[0] });
    }
    catch {
        res.status(500).json({ error: 'Server error' });
    }
});
router.get('/ledger', auth_1.requireAdmin, (0, auth_1.requireRole)('SUPER_ADMIN', 'FINANCE_AUDITOR', 'COMPLIANCE_OFFICER'), async (req, res) => {
    try {
        const { page = 1, limit = 50, purpose = '' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let query = `SELECT le.*, dw.currency as debit_currency, cw.currency as credit_currency
                 FROM ledger_entries le
                 LEFT JOIN wallets dw ON le.debit_wallet_id = dw.id
                 LEFT JOIN wallets cw ON le.credit_wallet_id = cw.id WHERE 1=1`;
        const params = [];
        if (purpose) {
            params.push(purpose);
            query += ` AND le.purpose = $${params.length}`;
        }
        params.push(Number(limit), offset);
        query += ` ORDER BY le.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
        const result = await db_1.default.query(query, params);
        const totals = await db_1.default.query('SELECT purpose, SUM(amount) as total FROM ledger_entries GROUP BY purpose');
        res.json({ entries: result.rows, totals: totals.rows });
    }
    catch {
        res.status(500).json({ error: 'Server error' });
    }
});
router.get('/stats', auth_1.requireAdmin, async (req, res) => {
    try {
        const userCount = await db_1.default.query('SELECT COUNT(*) FROM users');
        const kycBreakdown = await db_1.default.query('SELECT kyc_status, COUNT(*) FROM users GROUP BY kyc_status');
        const walletTotals = await db_1.default.query('SELECT currency, SUM(balance) as total FROM wallets GROUP BY currency');
        const cardCount = await db_1.default.query("SELECT COUNT(*) FROM cards WHERE status = 'ACTIVE'");
        const txnVolume = await db_1.default.query('SELECT SUM(amount) as total FROM ledger_entries');
        const pendingKyc = await db_1.default.query("SELECT COUNT(*) FROM users WHERE kyc_status = 'PENDING_REVIEW'");
        res.json({
            totalUsers: parseInt(userCount.rows[0].count),
            kycBreakdown: kycBreakdown.rows,
            walletTotals: walletTotals.rows,
            activeCards: parseInt(cardCount.rows[0].count),
            totalVolume: txnVolume.rows[0].total || 0,
            pendingKycReview: parseInt(pendingKyc.rows[0].count),
        });
    }
    catch {
        res.status(500).json({ error: 'Server error' });
    }
});
router.post('/admins', auth_1.requireAdmin, (0, auth_1.requireRole)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { email, password, role } = req.body;
        const hash = await bcryptjs_1.default.hash(password, 12);
        const result = await db_1.default.query('INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role', [email, hash, role]);
        res.json({ success: true, admin: result.rows[0] });
    }
    catch (err) {
        if (err.code === '23505')
            return res.status(409).json({ error: 'Email already exists' });
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
