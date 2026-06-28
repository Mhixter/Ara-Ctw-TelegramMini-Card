"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = __importDefault(require("../db"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const IS_PRODUCTION = !!auth_1.BOT_TOKEN;
// ── Helper: upsert Telegram user + wallet ─────────────────────────────────────
async function upsertTelegramUser(telegramId, username, firstName) {
    const result = await db_1.default.query(`INSERT INTO users (telegram_id, first_name, kyc_status, is_active)
     VALUES ($1, $2, 'PENDING', true)
     ON CONFLICT (telegram_id) DO UPDATE
       SET first_name = COALESCE(EXCLUDED.first_name, users.first_name),
           updated_at = NOW()
     RETURNING *`, [telegramId, firstName || username || null]);
    const user = result.rows[0];
    await db_1.default.query(`INSERT INTO wallets (user_id, currency, balance)
     VALUES ($1, 'NGN', 0)
     ON CONFLICT (user_id, currency) DO NOTHING`, [user.id]);
    return user;
}
// ── POST /api/auth/telegram ───────────────────────────────────────────────────
router.post('/telegram', async (req, res) => {
    try {
        const { initData, widgetData, telegramId, username, firstName } = req.body;
        let telegramUser = null;
        if (IS_PRODUCTION) {
            if (initData && initData.length > 20) {
                telegramUser = (0, auth_1.verifyTelegramInitData)(initData);
                if (!telegramUser) {
                    console.warn('[auth] initData HMAC failed');
                    return res.status(401).json({ error: 'Invalid or expired Telegram session. Please reopen the app.' });
                }
            }
            else if (widgetData && widgetData.hash) {
                telegramUser = (0, auth_1.verifyTelegramWidgetData)(widgetData);
                if (!telegramUser) {
                    console.warn('[auth] Widget HMAC failed');
                    return res.status(401).json({ error: 'Invalid Telegram login. Please try again.' });
                }
            }
            else {
                console.warn('[auth] No valid auth source in production');
                return res.status(401).json({ error: 'Telegram authentication required.' });
            }
        }
        else {
            console.warn('[auth] DEV mode — identity not verified');
            if (initData && initData.length > 20)
                telegramUser = (0, auth_1.verifyTelegramInitData)(initData);
            if (!telegramUser && widgetData?.hash)
                telegramUser = (0, auth_1.verifyTelegramWidgetData)(widgetData);
            if (!telegramUser && telegramId)
                telegramUser = { telegramId: Number(telegramId), username, firstName };
        }
        if (!telegramUser) {
            return res.status(401).json({ error: 'Could not identify Telegram user.' });
        }
        const user = await upsertTelegramUser(telegramUser.telegramId, telegramUser.username, telegramUser.firstName);
        const token = (0, auth_1.generateJWT)(telegramUser.telegramId, user.id);
        res.json({
            token,
            user: {
                id: user.id,
                telegramId: telegramUser.telegramId,
                username: telegramUser.username,
                firstName: telegramUser.firstName || user.first_name,
                kycStatus: user.kyc_status,
                isActive: user.is_active,
            },
        });
    }
    catch (err) {
        console.error('[auth] Telegram auth error:', err);
        res.status(500).json({ error: 'Server error during authentication.' });
    }
});
// ── POST /api/auth/admin/login ────────────────────────────────────────────────
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const result = await db_1.default.query('SELECT * FROM admin_users WHERE email = $1 AND is_active = true', [email]);
        const admin = result.rows[0];
        if (!admin)
            return res.status(401).json({ error: 'Invalid credentials.' });
        const valid = await bcryptjs_1.default.compare(password, admin.password_hash);
        if (!valid)
            return res.status(401).json({ error: 'Invalid credentials.' });
        const token = (0, auth_1.generateJWT)(0, admin.id, admin.role);
        res.json({ token, admin: { id: admin.id, email: admin.email, role: admin.role } });
    }
    catch (err) {
        console.error('[auth] Admin login error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});
exports.default = router;
