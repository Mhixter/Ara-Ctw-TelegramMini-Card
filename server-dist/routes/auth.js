"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const axios_1 = __importDefault(require("axios"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const IS_PRODUCTION = !!auth_1.BOT_TOKEN;
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || '';
// ── Helper: upsert user + wallet ──────────────────────────────────────────────
async function upsertUserAndWallet(fields) {
    let upsertResult;
    if (fields.githubId) {
        upsertResult = await db_1.default.query(`INSERT INTO users (github_id, email, first_name, kyc_status, is_active)
       VALUES ($1, $2, $3, 'PENDING', true)
       ON CONFLICT (github_id) DO UPDATE
         SET email = COALESCE(EXCLUDED.email, users.email),
             first_name = COALESCE(EXCLUDED.first_name, users.first_name)
       RETURNING *`, [fields.githubId, fields.email || null, fields.firstName || null]);
    }
    else if (fields.email && fields.passwordHash) {
        upsertResult = await db_1.default.query(`INSERT INTO users (email, first_name, password_hash, kyc_status, is_active)
       VALUES ($1, $2, $3, 'PENDING', true)
       RETURNING *`, [fields.email, fields.firstName || null, fields.passwordHash]);
    }
    else if (fields.telegramId) {
        upsertResult = await db_1.default.query(`INSERT INTO users (telegram_id, kyc_status, is_active)
       VALUES ($1, 'PENDING', true)
       ON CONFLICT (telegram_id) DO UPDATE SET telegram_id = EXCLUDED.telegram_id
       RETURNING *`, [fields.telegramId]);
    }
    else {
        throw new Error('No valid identifier provided');
    }
    const user = upsertResult.rows[0];
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
        if (!telegramUser)
            return res.status(401).json({ error: 'Invalid Telegram data' });
        const user = await upsertUserAndWallet({ telegramId: telegramUser.telegramId });
        const token = (0, auth_1.generateJWT)(telegramUser.telegramId, user.id);
        res.json({
            token,
            user: {
                id: user.id,
                telegramId: telegramUser.telegramId,
                username: telegramUser.username,
                firstName: telegramUser.firstName,
                kycStatus: user.kyc_status,
                isActive: user.is_active,
            },
        });
    }
    catch (err) {
        console.error('[auth] Telegram auth error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});
// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }
        const existing = await db_1.default.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        const user = await upsertUserAndWallet({
            email: email.toLowerCase(),
            firstName: firstName || null,
            passwordHash,
        });
        const token = (0, auth_1.generateJWT)(0, user.id);
        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                kycStatus: user.kyc_status,
                isActive: user.is_active,
            },
        });
    }
    catch (err) {
        console.error('[auth] Register error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});
// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }
        const result = await db_1.default.query('SELECT * FROM users WHERE email = $1 AND is_active = true', [email.toLowerCase()]);
        const user = result.rows[0];
        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const valid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }
        const token = (0, auth_1.generateJWT)(user.telegram_id || 0, user.id);
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                kycStatus: user.kyc_status,
                isActive: user.is_active,
            },
        });
    }
    catch (err) {
        console.error('[auth] Login error:', err);
        res.status(500).json({ error: 'Server error' });
    }
});
// ── GET /api/auth/github ──────────────────────────────────────────────────────
router.get('/github', (req, res) => {
    if (!GITHUB_CLIENT_ID || !GITHUB_REDIRECT_URI) {
        return res.status(503).json({ error: 'GitHub OAuth is not configured on this server.' });
    }
    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: GITHUB_REDIRECT_URI,
        scope: 'user:email',
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});
// ── GET /api/auth/github/callback ─────────────────────────────────────────────
router.get('/github/callback', async (req, res) => {
    const { code, error: oauthError } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || '';
    function redirectError(msg) {
        const target = frontendUrl || '/';
        return res.redirect(`${target}?auth_error=${encodeURIComponent(msg)}`);
    }
    if (oauthError || !code) {
        return redirectError('GitHub sign-in was cancelled or failed.');
    }
    try {
        // Exchange code for access token
        const tokenRes = await axios_1.default.post('https://github.com/login/oauth/access_token', {
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code,
            redirect_uri: GITHUB_REDIRECT_URI,
        }, { headers: { Accept: 'application/json' } });
        const { access_token } = tokenRes.data;
        if (!access_token)
            return redirectError('GitHub did not return an access token.');
        // Get primary profile
        const profileRes = await axios_1.default.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'BoorderPay' },
        });
        const profile = profileRes.data;
        // GitHub may not expose email in /user — fetch from /user/emails
        let email = profile.email || null;
        if (!email) {
            const emailsRes = await axios_1.default.get('https://api.github.com/user/emails', {
                headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'BoorderPay' },
            });
            const primary = emailsRes.data
                .find(e => e.primary && e.verified);
            email = primary?.email || null;
        }
        if (!profile.id)
            return redirectError('Could not retrieve GitHub profile.');
        const user = await upsertUserAndWallet({
            githubId: String(profile.id),
            email,
            firstName: profile.name?.split(' ')[0] || null,
        });
        const token = (0, auth_1.generateJWT)(0, user.id);
        const userPayload = encodeURIComponent(JSON.stringify({
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            kycStatus: user.kyc_status,
            isActive: user.is_active,
        }));
        res.redirect(`${frontendUrl}/?auth_token=${token}&auth_user=${userPayload}`);
    }
    catch (err) {
        console.error('[auth] GitHub callback error:', err);
        return redirectError('GitHub authentication failed. Please try again.');
    }
});
// ── POST /api/auth/admin/login ────────────────────────────────────────────────
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
