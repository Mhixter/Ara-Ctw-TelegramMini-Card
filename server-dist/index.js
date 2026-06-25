"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("./db"));
const auth_1 = __importDefault(require("./routes/auth"));
const wallet_1 = __importDefault(require("./routes/wallet"));
const kyc_1 = __importDefault(require("./routes/kyc"));
const cards_1 = __importDefault(require("./routes/cards"));
const admin_1 = __importDefault(require("./routes/admin"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)({ contentSecurityPolicy: false }));
app.use((0, cors_1.default)({ origin: true, credentials: true }));
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/wallet', wallet_1.default);
app.use('/api/kyc', kyc_1.default);
app.use('/api/cards', cards_1.default);
app.use('/api/admin', admin_1.default);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), powered_by: 'Ara Tech' }));
app.use(express_1.default.static(path_1.default.join(__dirname, '../dist')));
app.get(/(.*)/, (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../dist/index.html'));
});
/**
 * Upsert the permanent super-admin account on every startup.
 * Credentials are sourced from env vars so they can be rotated without redeployment.
 * Falls back to the hardcoded defaults if env vars are not set.
 */
async function ensureSuperAdmin() {
    const email = process.env.SUPER_ADMIN_EMAIL || 'saidumuhammed664@gmail.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'Mhixter664@gmail.com';
    try {
        const existing = await db_1.default.query('SELECT id, password_hash FROM admin_users WHERE email = $1', [email]);
        const hash = await bcryptjs_1.default.hash(password, 12);
        if (existing.rows.length === 0) {
            await db_1.default.query(`INSERT INTO admin_users (email, password_hash, role, is_active)
         VALUES ($1, $2, 'SUPER_ADMIN', true)`, [email, hash]);
            console.log(`[admin-seed] Super admin created: ${email}`);
        }
        else {
            // Always refresh the hash so password changes in env take effect on restart
            await db_1.default.query(`UPDATE admin_users SET password_hash = $1, role = 'SUPER_ADMIN', is_active = true WHERE email = $2`, [hash, email]);
            console.log(`[admin-seed] Super admin credentials refreshed: ${email}`);
        }
    }
    catch (err) {
        console.error('[admin-seed] Failed to upsert super admin:', err);
    }
}
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await ensureSuperAdmin();
});
