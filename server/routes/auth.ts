import { Router, Request, Response } from 'express';
import pool from '../db';
import bcrypt from 'bcryptjs';
import { BOT_TOKEN, verifyTelegramInitData, verifyTelegramWidgetData, generateJWT } from '../middleware/auth';

const router = Router();

const IS_PRODUCTION = !!BOT_TOKEN;

// ── Helper: upsert Telegram user + wallet ─────────────────────────────────────
async function upsertTelegramUser(telegramId: number, username?: string, firstName?: string) {
  const result = await pool.query(
    `INSERT INTO users (telegram_id, first_name, kyc_status, is_active)
     VALUES ($1, $2, 'PENDING', true)
     ON CONFLICT (telegram_id) DO UPDATE
       SET first_name = COALESCE(EXCLUDED.first_name, users.first_name),
           updated_at = NOW()
     RETURNING *`,
    [telegramId, firstName || username || null]
  );
  const user = result.rows[0];

  await pool.query(
    `INSERT INTO wallets (user_id, currency, balance)
     VALUES ($1, 'NGN', 0)
     ON CONFLICT (user_id, currency) DO NOTHING`,
    [user.id]
  );

  return user;
}

// ── POST /api/auth/telegram ───────────────────────────────────────────────────
router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { initData, widgetData, telegramId, username, firstName } = req.body;

    let telegramUser: { telegramId: number; username?: string; firstName?: string } | null = null;

    if (IS_PRODUCTION) {
      if (initData && initData.length > 20) {
        telegramUser = verifyTelegramInitData(initData);
        if (!telegramUser) {
          console.warn('[auth] initData HMAC failed');
          return res.status(401).json({ error: 'Invalid or expired Telegram session. Please reopen the app.' });
        }
      } else if (widgetData && widgetData.hash) {
        telegramUser = verifyTelegramWidgetData(widgetData);
        if (!telegramUser) {
          console.warn('[auth] Widget HMAC failed');
          return res.status(401).json({ error: 'Invalid Telegram login. Please try again.' });
        }
      } else {
        console.warn('[auth] No valid auth source in production');
        return res.status(401).json({ error: 'Telegram authentication required.' });
      }
    } else {
      console.warn('[auth] DEV mode — identity not verified');
      if (initData && initData.length > 20) telegramUser = verifyTelegramInitData(initData);
      if (!telegramUser && widgetData?.hash)  telegramUser = verifyTelegramWidgetData(widgetData);
      if (!telegramUser && telegramId)         telegramUser = { telegramId: Number(telegramId), username, firstName };
    }

    if (!telegramUser) {
      return res.status(401).json({ error: 'Could not identify Telegram user.' });
    }

    const user = await upsertTelegramUser(telegramUser.telegramId, telegramUser.username, telegramUser.firstName);
    const token = generateJWT(telegramUser.telegramId, user.id);

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
  } catch (err) {
    console.error('[auth] Telegram auth error:', err);
    res.status(500).json({ error: 'Server error during authentication.' });
  }
});

// ── POST /api/auth/admin/login ────────────────────────────────────────────────
router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE email = $1 AND is_active = true',
      [email]
    );
    const admin = result.rows[0];
    if (!admin) return res.status(401).json({ error: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = generateJWT(0, admin.id, admin.role);
    res.json({ token, admin: { id: admin.id, email: admin.email, role: admin.role } });
  } catch (err) {
    console.error('[auth] Admin login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
