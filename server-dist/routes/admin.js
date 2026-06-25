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
router.get('/users', auth_1.requireAdmin, (0, auth_1.requireRole)('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'CUSTOMER_SUPPORT'), async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', kycStatus = '' } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let query = 'SELECT u.*, uk.full_name, uk.liveness_score, uk.verified_at FROM users u LEFT JOIN user_kyc uk ON u.id = uk.user_id WHERE 1=1';
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
        const user = await db_1.default.query('SELECT u.*, uk.full_name, uk.date_of_birth, uk.liveness_score, uk.id_document_url, uk.verified_at FROM users u LEFT JOIN user_kyc uk ON u.id = uk.user_id WHERE u.id = $1', [userId]);
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
        if (!['PENDING', 'TIER_1', 'TIER_2', 'BANNED'].includes(kycStatus)) {
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
        let query = `SELECT le.*, dw.currency as debit_currency, cw.currency as credit_currency FROM ledger_entries le LEFT JOIN wallets dw ON le.debit_wallet_id = dw.id LEFT JOIN wallets cw ON le.credit_wallet_id = cw.id WHERE 1=1`;
        const params = [];
        if (purpose) {
            params.push(purpose);
            query += ` AND le.purpose = $${params.length}`;
        }
        params.push(Number(limit), offset);
        query += ` ORDER BY le.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
        const result = await db_1.default.query(query, params);
        const totals = await db_1.default.query(`SELECT purpose, SUM(amount) as total FROM ledger_entries GROUP BY purpose`);
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
        const cardCount = await db_1.default.query('SELECT COUNT(*) FROM cards WHERE status = $1', ['ACTIVE']);
        const txnVolume = await db_1.default.query('SELECT SUM(amount) as total FROM ledger_entries');
        res.json({
            totalUsers: parseInt(userCount.rows[0].count),
            kycBreakdown: kycBreakdown.rows,
            walletTotals: walletTotals.rows,
            activeCards: parseInt(cardCount.rows[0].count),
            totalVolume: txnVolume.rows[0].total || 0
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
