"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const IS_PRODUCTION = !!auth_1.BOT_TOKEN;
router.post('/telegram', async (req, res) => {
    try {
        const { initData } = req.body;
        let telegramUser = null;
        if (IS_PRODUCTION) {
            // ── Strict mode (TELEGRAM_BOT_TOKEN is set) ──────────────────────────────
            // initData MUST be present and pass HMAC verification.
            // No fallback — reject anything that can't be cryptographically verified.
            if (!initData) {
                console.warn('[auth] Request rejected: initData missing in production mode');
                return res.status(401).json({ error: 'Telegram initData is required' });
            }
            telegramUser = (0, auth_1.verifyTelegramInitData)(initData);
            if (!telegramUser) {
                console.warn('[auth] Request rejected: initData failed HMAC verification');
                return res.status(401).json({ error: 'Invalid or expired Telegram session. Please reopen the app.' });
            }
        }
        else {
            // ── Dev / sandbox mode (no bot token set) ────────────────────────────────
            // Accept raw telegramId for local testing only.
            console.warn('[auth] Running in DEV mode — Telegram identity is NOT verified');
            if (initData && initData.length > 20) {
                telegramUser = (0, auth_1.verifyTelegramInitData)(initData);
            }
            if (!telegramUser) {
                const { telegramId, username, firstName } = req.body;
                if (telegramId) {
                    telegramUser = { telegramId: Number(telegramId), username, firstName };
                }
            }
        }
        if (!telegramUser) {
            return res.status(401).json({ error: 'Invalid Telegram data' });
        }
        const { telegramId, username, firstName } = telegramUser;
        const upsertResult = await db_1.default.query(`INSERT INTO users (telegram_id, kyc_status, is_active)
       VALUES ($1, 'PENDING', true)
       ON CONFLICT (telegram_id) DO UPDATE SET telegram_id = EXCLUDED.telegram_id
       RETURNING *`, [telegramId]);
        const user = upsertResult.rows[0];
        await db_1.default.query(`INSERT INTO wallets (user_id, currency, balance)
       VALUES ($1, 'NGN', 0)
       ON CONFLICT (user_id, currency) DO NOTHING`, [user.id]);
        const token = (0, auth_1.generateJWT)(telegramId, user.id);
        res.json({
            token,
            user: {
                id: user.id,
                telegramId,
                username,
                firstName,
                kycStatus: user.kyc_status,
                isActive: user.is_active,
            },
        });
    }
    catch (err) {
        console.error('[auth] Auth error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await db_1.default.query('SELECT * FROM admin_users WHERE email = $1 AND is_active = true', [email]);
        const admin = result.rows[0];
        if (!admin)
            return res.status(401).json({ error: 'Invalid credentials' });
        const valid = await bcryptjs_1.default.compare(password, admin.password_hash);
        if (!valid)
            return res.status(401).json({ error: 'Invalid credentials' });
        const token = (0, auth_1.generateJWT)(0, admin.id, admin.role);
        res.json({ token, admin: { id: admin.id, email: admin.email, role: admin.role } });
    }
    catch (err) {
        console.error('[auth] Admin login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});
exports.default = router;
