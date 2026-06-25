"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTelegramInitData = verifyTelegramInitData;
exports.generateJWT = generateJWT;
exports.verifyJWT = verifyJWT;
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.requireRole = requireRole;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'fintech-secret-key-dev-2024';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
function verifyTelegramInitData(initData) {
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        if (!hash)
            return null;
        urlParams.delete('hash');
        const dataCheckArr = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, val]) => `${key}=${val}`)
            .join('\n');
        const secretKey = crypto_1.default.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
        const computedHash = crypto_1.default.createHmac('sha256', secretKey).update(dataCheckArr).digest('hex');
        if (computedHash !== hash)
            return null;
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
