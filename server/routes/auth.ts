import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db';
import { BOT_TOKEN, verifyTelegramInitData, generateJWT, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();

const IS_PRODUCTION = !!BOT_TOKEN;

router.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;

    let telegramUser: { telegramId: number; username?: string; firstName?: string } | null = null;

    if (IS_PRODUCTION) {
      // ── Strict mode (TELEGRAM_BOT_TOKEN is set) ──────────────────────────────
      // initData MUST be present and pass HMAC verification.
      // No fallback — reject anything that can't be cryptographically verified.
      if (!initData) {
        console.warn('[auth] Request rejected: initData missing in production mode');
        return res.status(401).json({ error: 'Telegram initData is required' });
      }

      telegramUser = verifyTelegramInitData(initData);

      if (!telegramUser) {
        console.warn('[auth] Request rejected: initData failed HMAC verification');
        return res.status(401).json({ error: 'Invalid or expired Telegram session. Please reopen the app.' });
      }
    } else {
      // ── Dev / sandbox mode (no bot token set) ────────────────────────────────
      // Accept raw telegramId for local testing only.
      console.warn('[auth] Running in DEV mode — Telegram identity is NOT verified');
      if (initData && initData.length > 20) {
        telegramUser = verifyTelegramInitData(initData);
      }
      if (!telegramUser) {
        const { telegramId, username, firstName } = req.body;
        if (telegramId) {
          telegramUser = { telegramId: Number(telegramId), username, firstName };
        }
      }
    }

    if (!telegramUser) {
      return res.status(401).json({ error: 'Invalid Telegram data' });
    }

    const { telegramId, username, firstName } = telegramUser;

    const upsertResult = await pool.query(
      `INSERT INTO users (telegram_id, kyc_status, is_active)
       VALUES ($1, 'PENDING', true)
       ON CONFLICT (telegram_id) DO UPDATE SET telegram_id = EXCLUDED.telegram_id
       RETURNING *`,
      [telegramId]
    );
    const user = upsertResult.rows[0];

    await pool.query(
      `INSERT INTO wallets (user_id, currency, balance)
       VALUES ($1, 'NGN', 0)
       ON CONFLICT (user_id, currency) DO NOTHING`,
      [user.id]
    );

    const token = generateJWT(telegramId, user.id);
    res.json({
      token,
      user: {
        id: user.id,
        telegramId,
        username,
        firstName,
        kycStatus: user.kyc_status,
        isActive: user.is_active,
      },
    });
  } catch (err) {
    console.error('[auth] Auth error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/admin/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query(
      'SELECT * FROM admin_users WHERE email = $1 AND is_active = true',
      [email]
    );
    const admin = result.rows[0];
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = generateJWT(0, admin.id, admin.role);
    res.json({ token, admin: { id: admin.id, email: admin.email, role: admin.role } });
  } catch (err) {
    console.error('[auth] Admin login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
