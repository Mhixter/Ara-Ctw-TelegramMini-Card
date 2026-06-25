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
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/kyc', kycRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), powered_by: 'Ara Tech' }));

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
