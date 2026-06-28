"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BOT_TOKEN = void 0;
exports.verifyTelegramWidgetData = verifyTelegramWidgetData;
exports.verifyTelegramInitData = verifyTelegramInitData;
exports.generateJWT = generateJWT;
exports.verifyJWT = verifyJWT;
exports.requireAuth = requireAuth;
exports.requireUUID = requireUUID;
exports.requireAdmin = requireAdmin;
exports.requireRole = requireRole;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'fintech-secret-key-dev-2024';
exports.BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60; // 24 hours
/**
 * Verifies Telegram WebApp initData using HMAC-SHA256.
 * Also rejects data older than INIT_DATA_MAX_AGE_SECONDS to prevent replay attacks.
 */
/**
 * Verifies data from the Telegram Login Widget.
 * Widget sends: id, first_name, last_name?, username?, photo_url?, auth_date, hash
 * Verification: HMAC-SHA256(data-check-string, SHA256(bot_token))
 */
function verifyTelegramWidgetData(data) {
    try {
        if (!exports.BOT_TOKEN)
            return null;
        const { hash, ...fields } = data;
        if (!hash)
            return null;
        const authDate = Number(fields.auth_date);
        const age = Math.floor(Date.now() / 1000) - authDate;
        if (age > INIT_DATA_MAX_AGE_SECONDS) {
            console.warn('[auth] Widget data expired (age=%ds)', age);
            return null;
        }
        const dataCheckString = Object.entries(fields)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');
        const secretKey = crypto_1.default.createHash('sha256').update(exports.BOT_TOKEN).digest();
        const computedHash = crypto_1.default
            .createHmac('sha256', secretKey)
            .update(dataCheckString)
            .digest('hex');
        if (computedHash !== hash) {
            console.warn('[auth] Widget HMAC mismatch');
            return null;
        }
        return {
            telegramId: Number(fields.id),
            username: fields.username,
            firstName: fields.first_name,
        };
    }
    catch {
        return null;
    }
}
function verifyTelegramInitData(initData) {
    try {
        if (!exports.BOT_TOKEN)
            return null;
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        if (!hash)
            return null;
        // Replay-attack guard: reject stale initData
        const authDate = urlParams.get('auth_date');
        if (authDate) {
            const age = Math.floor(Date.now() / 1000) - Number(authDate);
            if (age > INIT_DATA_MAX_AGE_SECONDS) {
                console.warn('[auth] initData expired (age=%ds)', age);
                return null;
            }
        }
        urlParams.delete('hash');
        const dataCheckArr = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, val]) => `${key}=${val}`)
            .join('\n');
        const secretKey = crypto_1.default
            .createHmac('sha256', 'WebAppData')
            .update(exports.BOT_TOKEN)
            .digest();
        const computedHash = crypto_1.default
            .createHmac('sha256', secretKey)
            .update(dataCheckArr)
            .digest('hex');
        if (computedHash !== hash) {
            console.warn('[auth] initData HMAC mismatch — possible forgery attempt');
            return null;
        }
        const userStr = urlParams.get('user');
        if (!userStr)
            return null;
        const user = JSON.parse(userStr);
        return { telegramId: user.id, username: user.username, firstName: user.first_name };
    }
    catch {
        return null;
    }
}
function generateJWT(telegramId, userId, role) {
    return jsonwebtoken_1.default.sign({ telegramId, userId, role }, JWT_SECRET, { expiresIn: '24h' });
}
function verifyJWT(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.slice(7);
    const payload = verifyJWT(token);
    if (!payload)
        return res.status(401).json({ error: 'Invalid token' });
    req.user = payload;
    next();
}
/**
 * Must be used after requireAuth on any route that queries DB columns typed UUID.
 * Rejects sessions where userId is an old integer ID (pre-UUID schema migration).
 * The client must re-authenticate to receive a fresh UUID-based JWT.
 */
function requireUUID(req, res, next) {
    const uid = req.user?.userId;
    if (!uid || !UUID_RE.test(uid)) {
        return res.status(401).json({
            error: 'Your session is outdated. Please sign in again.',
            code: 'SESSION_EXPIRED',
        });
    }
    next();
}
function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.slice(7);
    const payload = verifyJWT(token);
    if (!payload || !payload.role)
        return res.status(401).json({ error: 'Admin access required' });
    req.user = payload;
    next();
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user?.role || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
    };
}
