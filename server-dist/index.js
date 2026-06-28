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
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : true;
app.use((0, cors_1.default)({ origin: allowedOrigins, credentials: true }));
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
app.use('/api/wallet', wallet_1.default);
app.use('/api/kyc', kyc_1.default);
app.use('/api/cards', cards_1.default);
app.use('/api/admin', admin_1.default);
app.get('/api/health', async (_req, res) => {
    const start = Date.now();
    let dbStatus = 'error';
    let dbError;
    let dbLatencyMs;
    try {
        const t0 = Date.now();
        await db_1.default.query('SELECT 1');
        dbLatencyMs = Date.now() - t0;
        dbStatus = 'ok';
    }
    catch (err) {
        dbError = err.message;
    }
    const envChecks = {
        DATABASE_URL: !!process.env.DATABASE_URL,
        JWT_SECRET: !!process.env.JWT_SECRET,
        TELEGRAM_BOT_TOKEN: !!process.env.TELEGRAM_BOT_TOKEN,
        ALLOWED_ORIGINS: !!process.env.ALLOWED_ORIGINS,
        SUPER_ADMIN_EMAIL: !!process.env.SUPER_ADMIN_EMAIL,
        SUPER_ADMIN_PASSWORD: !!process.env.SUPER_ADMIN_PASSWORD,
    };
    const optionalEnvChecks = {
        WEBHOOK_SECRET: !!process.env.WEBHOOK_SECRET,
        CARD_ISSUER_API_KEY: !!process.env.CARD_ISSUER_API_KEY,
    };
    const allRequired = Object.values(envChecks).every(Boolean);
    const overall = dbStatus === 'ok' && allRequired ? 'ok' : 'degraded';
    const mode = process.env.TELEGRAM_BOT_TOKEN ? 'production' : 'dev';
    res.status(overall === 'ok' ? 200 : 503).json({
        status: overall,
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - start,
        mode,
        database: { status: dbStatus, latencyMs: dbLatencyMs, ...(dbError ? { error: dbError } : {}) },
        env: { required: envChecks, optional: optionalEnvChecks, allRequiredPresent: allRequired },
        server: { port: PORT, nodeVersion: process.version, uptime: Math.floor(process.uptime()) },
    });
});
app.use(express_1.default.static(path_1.default.join(__dirname, '../dist')));
app.get(/(.*)/, (_req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../dist/index.html'));
});
// ─── Schema migrations ────────────────────────────────────────────────────────
// Runs on every server startup so schema is always current regardless of how
// Railway launches the process (npm start, node directly, etc.).
async function runMigrations() {
    console.log('[migrate] Running schema migrations…');
    const client = await db_1.default.connect();
    try {
        // 1. Create tables
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_id  BIGINT UNIQUE NOT NULL,
        email        VARCHAR(255),
        kyc_status   VARCHAR(20)  DEFAULT 'PENDING',
        is_active    BOOLEAN      DEFAULT true,
        created_at   TIMESTAMPTZ  DEFAULT NOW(),
        updated_at   TIMESTAMPTZ  DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        currency               VARCHAR(10)   NOT NULL DEFAULT 'NGN',
        balance                NUMERIC(18,2) NOT NULL DEFAULT 0,
        virtual_account_number VARCHAR(20),
        virtual_bank_name      VARCHAR(100),
        created_at             TIMESTAMPTZ   DEFAULT NOW(),
        updated_at             TIMESTAMPTZ   DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS wallets_user_currency_idx ON wallets(user_id, currency);

      CREATE TABLE IF NOT EXISTS ledger_entries (
        id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_reference VARCHAR(255) UNIQUE NOT NULL,
        debit_wallet_id       UUID REFERENCES wallets(id),
        credit_wallet_id      UUID REFERENCES wallets(id),
        amount                NUMERIC(18,2) NOT NULL,
        purpose               VARCHAR(50)   NOT NULL,
        metadata              JSONB         DEFAULT '{}',
        created_at            TIMESTAMPTZ   DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cards (
        id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider_card_id   VARCHAR(255) NOT NULL,
        card_token         VARCHAR(255),
        mask_pan           VARCHAR(20),
        card_tier          VARCHAR(20)   DEFAULT 'GOLD',
        card_brand         VARCHAR(20)   DEFAULT 'VISA',
        card_currency      VARCHAR(10)   DEFAULT 'NGN',
        daily_limit        NUMERIC(18,2) DEFAULT 500,
        monthly_limit      NUMERIC(18,2) DEFAULT 5000,
        amount_spent_today NUMERIC(18,2) DEFAULT 0,
        status             VARCHAR(20)   DEFAULT 'ACTIVE',
        created_at         TIMESTAMPTZ   DEFAULT NOW(),
        updated_at         TIMESTAMPTZ   DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_kyc (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bvn_hash        VARCHAR(64),
        nin_hash        VARCHAR(64),
        full_name       VARCHAR(255),
        date_of_birth   DATE,
        id_document_url TEXT,
        liveness_score  NUMERIC(5,2),
        verified_at     TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email         VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL DEFAULT '',
        role          VARCHAR(50)  NOT NULL DEFAULT 'CUSTOMER_SUPPORT',
        is_active     BOOLEAN      DEFAULT true,
        created_at    TIMESTAMPTZ  DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  DEFAULT NOW()
      );
    `);
        // 2. Patch missing columns on pre-existing tables
        const patches = [
            `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT ''`,
            `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role          VARCHAR(50)  DEFAULT 'CUSTOMER_SUPPORT'`,
            `ALTER TABLE users       ADD COLUMN IF NOT EXISTS email         VARCHAR(255)`,
            `ALTER TABLE users       ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`,
            `ALTER TABLE users       ADD COLUMN IF NOT EXISTS google_id     VARCHAR(255)`,
            `ALTER TABLE users       ADD COLUMN IF NOT EXISTS github_id     VARCHAR(255)`,
            `CREATE UNIQUE INDEX IF NOT EXISTS users_github_id_idx ON users(github_id) WHERE github_id IS NOT NULL`,
            `ALTER TABLE users       ADD COLUMN IF NOT EXISTS first_name    VARCHAR(255)`,
            `ALTER TABLE users       ADD COLUMN IF NOT EXISTS kyc_status    VARCHAR(20)  DEFAULT 'PENDING'`,
            `ALTER TABLE users       ADD COLUMN IF NOT EXISTS is_active     BOOLEAN      DEFAULT true`,
            `ALTER TABLE users       ALTER COLUMN telegram_id DROP NOT NULL`,
            `CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx    ON users(email) WHERE email IS NOT NULL`,
            `CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_idx ON users(google_id) WHERE google_id IS NOT NULL`,
            `ALTER TABLE wallets     ADD COLUMN IF NOT EXISTS virtual_account_number VARCHAR(20)`,
            `ALTER TABLE wallets     ADD COLUMN IF NOT EXISTS virtual_bank_name      VARCHAR(100)`,
            `ALTER TABLE cards       ADD COLUMN IF NOT EXISTS card_token         VARCHAR(255)`,
            `ALTER TABLE cards       ADD COLUMN IF NOT EXISTS card_tier           VARCHAR(20)   DEFAULT 'GOLD'`,
            `ALTER TABLE cards       ADD COLUMN IF NOT EXISTS card_brand          VARCHAR(20)   DEFAULT 'VISA'`,
            `ALTER TABLE cards       ADD COLUMN IF NOT EXISTS card_currency       VARCHAR(10)   DEFAULT 'NGN'`,
            `ALTER TABLE cards       ADD COLUMN IF NOT EXISTS daily_limit         NUMERIC(18,2) DEFAULT 500`,
            `ALTER TABLE cards       ADD COLUMN IF NOT EXISTS monthly_limit       NUMERIC(18,2) DEFAULT 5000`,
            `ALTER TABLE cards       ADD COLUMN IF NOT EXISTS amount_spent_today  NUMERIC(18,2) DEFAULT 0`,
            `ALTER TABLE user_kyc    ADD COLUMN IF NOT EXISTS bvn_hash        VARCHAR(64)`,
            `ALTER TABLE user_kyc    ADD COLUMN IF NOT EXISTS nin_hash        VARCHAR(64)`,
            `ALTER TABLE user_kyc    ADD COLUMN IF NOT EXISTS id_document_url TEXT`,
            `ALTER TABLE user_kyc    ADD COLUMN IF NOT EXISTS liveness_score  NUMERIC(5,2)`,
            `ALTER TABLE user_kyc    ADD COLUMN IF NOT EXISTS verified_at     TIMESTAMPTZ`,
            `ALTER TABLE user_kyc    ADD COLUMN IF NOT EXISTS country         VARCHAR(10)  DEFAULT 'NG'`,
            `ALTER TABLE user_kyc    ADD COLUMN IF NOT EXISTS id_type         VARCHAR(30)  DEFAULT 'BVN_NIN'`,
            `ALTER TABLE user_kyc    ADD COLUMN IF NOT EXISTS id_number_hash  VARCHAR(64)`,
            `ALTER TABLE user_kyc    ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ  DEFAULT NOW()`,
            `ALTER TABLE users       ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT`,
            `ALTER TABLE users       ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ  DEFAULT NOW()`,
        ];
        let ok = 0;
        let failed = 0;
        for (const sql of patches) {
            try {
                await client.query(sql);
                ok++;
            }
            catch (err) {
                failed++;
                console.error('[migrate] FAILED:', sql.slice(0, 80), '-', err.message);
            }
        }
        console.log(`[migrate] ✅ Done — ${ok} patches applied, ${failed} skipped/failed.`);
    }
    catch (err) {
        console.error('[migrate] ❌ Fatal migration error:', err.message);
        throw err;
    }
    finally {
        client.release();
    }
}
// ─── Super-admin seed ─────────────────────────────────────────────────────────
async function ensureSuperAdmin() {
    const email = process.env.SUPER_ADMIN_EMAIL || 'saidumuhammed664@gmail.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'Mhixter664@gmail.com';
    try {
        const hash = await bcryptjs_1.default.hash(password, 12);
        const existing = await db_1.default.query('SELECT id FROM admin_users WHERE email = $1', [email]);
        if (existing.rows.length === 0) {
            await db_1.default.query(`INSERT INTO admin_users (email, password_hash, role, is_active)
         VALUES ($1, $2, 'SUPER_ADMIN', true)`, [email, hash]);
            console.log(`[admin-seed] Super admin created: ${email}`);
        }
        else {
            await db_1.default.query(`UPDATE admin_users SET password_hash = $1, role = 'SUPER_ADMIN', is_active = true WHERE email = $2`, [hash, email]);
            console.log(`[admin-seed] Super admin credentials refreshed: ${email}`);
        }
    }
    catch (err) {
        console.error('[admin-seed] Failed to upsert super admin:', err);
    }
}
// ─── Startup ──────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    try {
        await runMigrations();
        await ensureSuperAdmin();
    }
    catch (err) {
        console.error('[startup] Migration failed — server is up but schema may be incomplete:', err);
    }
});
