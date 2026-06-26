import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import bcrypt from 'bcryptjs';
import pool from './db';
import authRouter from './routes/auth';
import walletRouter from './routes/wallet';
import kycRouter from './routes/kyc';
import cardsRouter from './routes/cards';
import adminRouter from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : true;

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/kyc', kycRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', async (_req, res) => {
  const start = Date.now();

  // ── 1. Database ping ────────────────────────────────────────────────────────
  let dbStatus: 'ok' | 'error' = 'error';
  let dbError: string | undefined;
  let dbLatencyMs: number | undefined;
  try {
    const t0 = Date.now();
    await pool.query('SELECT 1');
    dbLatencyMs = Date.now() - t0;
    dbStatus = 'ok';
  } catch (err: any) {
    dbError = err.message;
  }

  // ── 2. Required env vars (show presence only, never values) ─────────────────
  const envChecks: Record<string, boolean> = {
    DATABASE_URL:         !!process.env.DATABASE_URL,
    JWT_SECRET:           !!process.env.JWT_SECRET,
    TELEGRAM_BOT_TOKEN:   !!process.env.TELEGRAM_BOT_TOKEN,
    ALLOWED_ORIGINS:      !!process.env.ALLOWED_ORIGINS,
    SUPER_ADMIN_EMAIL:    !!process.env.SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_PASSWORD: !!process.env.SUPER_ADMIN_PASSWORD,
  };
  const optionalEnvChecks: Record<string, boolean> = {
    WEBHOOK_SECRET:    !!process.env.WEBHOOK_SECRET,
    CARD_ISSUER_API_KEY: !!process.env.CARD_ISSUER_API_KEY,
  };

  const allRequired = Object.values(envChecks).every(Boolean);
  const overall = dbStatus === 'ok' && allRequired ? 'ok' : 'degraded';

  // ── 3. Mode flags ───────────────────────────────────────────────────────────
  const mode = process.env.TELEGRAM_BOT_TOKEN ? 'production' : 'dev';

  const body = {
    status: overall,
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - start,
    mode,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
      ...(dbError ? { error: dbError } : {}),
    },
    env: {
      required: envChecks,
      optional: optionalEnvChecks,
      allRequiredPresent: allRequired,
    },
    server: {
      port: PORT,
      nodeVersion: process.version,
      uptime: Math.floor(process.uptime()),
    },
  };

  res.status(overall === 'ok' ? 200 : 503).json(body);
});

app.use(express.static(path.join(__dirname, '../dist')));
app.get(/(.*)/, (_req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

/**
 * Upsert the permanent super-admin account on every startup.
 * Credentials are sourced from env vars so they can be rotated without redeployment.
 * Falls back to the hardcoded defaults if env vars are not set.
 */
async function ensureSuperAdmin() {
  const email    = process.env.SUPER_ADMIN_EMAIL    || 'saidumuhammed664@gmail.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Mhixter664@gmail.com';

  try {
    const existing = await pool.query(
      'SELECT id, password_hash FROM admin_users WHERE email = $1',
      [email]
    );

    const hash = await bcrypt.hash(password, 12);

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO admin_users (email, password_hash, role, is_active)
         VALUES ($1, $2, 'SUPER_ADMIN', true)`,
        [email, hash]
      );
      console.log(`[admin-seed] Super admin created: ${email}`);
    } else {
      // Always refresh the hash so password changes in env take effect on restart
      await pool.query(
        `UPDATE admin_users SET password_hash = $1, role = 'SUPER_ADMIN', is_active = true WHERE email = $2`,
        [hash, email]
      );
      console.log(`[admin-seed] Super admin credentials refreshed: ${email}`);
    }
  } catch (err) {
    console.error('[admin-seed] Failed to upsert super admin:', err);
  }
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await ensureSuperAdmin();
});
