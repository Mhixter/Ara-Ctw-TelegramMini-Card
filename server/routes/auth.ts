import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import pool from '../db';
import { BOT_TOKEN, verifyTelegramInitData, verifyTelegramWidgetData, generateJWT, AuthRequest } from '../middleware/auth';

const router = Router();

const IS_PRODUCTION = !!BOT_TOKEN;

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI  = process.env.GOOGLE_REDIRECT_URI || '';

// ── Helper: upsert user + wallet ──────────────────────────────────────────────
async function upsertUserAndWallet(fields: {
  telegramId?: number | null;
  email?: string | null;
  firstName?: string | null;
  googleId?: string | null;
  passwordHash?: string | null;
}) {
  let upsertResult;

  if (fields.googleId) {
    upsertResult = await pool.query(
      `INSERT INTO users (google_id, email, first_name, kyc_status, is_active)
       VALUES ($1, $2, $3, 'PENDING', true)
       ON CONFLICT (google_id) DO UPDATE
         SET email = COALESCE(EXCLUDED.email, users.email),
             first_name = COALESCE(EXCLUDED.first_name, users.first_name)
       RETURNING *`,
      [fields.googleId, fields.email || null, fields.firstName || null]
    );
  } else if (fields.email && fields.passwordHash) {
    upsertResult = await pool.query(
      `INSERT INTO users (email, first_name, password_hash, kyc_status, is_active)
       VALUES ($1, $2, $3, 'PENDING', true)
       RETURNING *`,
      [fields.email, fields.firstName || null, fields.passwordHash]
    );
  } else if (fields.telegramId) {
    upsertResult = await pool.query(
      `INSERT INTO users (telegram_id, kyc_status, is_active)
       VALUES ($1, 'PENDING', true)
       ON CONFLICT (telegram_id) DO UPDATE SET telegram_id = EXCLUDED.telegram_id
       RETURNING *`,
      [fields.telegramId]
    );
  } else {
    throw new Error('No valid identifier provided');
  }

  const user = upsertResult.rows[0];

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

    if (!telegramUser) return res.status(401).json({ error: 'Invalid Telegram data' });

    const user = await upsertUserAndWallet({ telegramId: telegramUser.telegramId });
    const token = generateJWT(telegramUser.telegramId, user.id);

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
  } catch (err) {
    console.error('[auth] Telegram auth error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await upsertUserAndWallet({
      email: email.toLowerCase(),
      firstName: firstName || null,
      passwordHash,
    });

    const token = generateJWT(0, user.id);
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
  } catch (err) {
    console.error('[auth] Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase()]
    );
    const user = result.rows[0];

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateJWT(user.telegram_id || 0, user.id);
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
  } catch (err) {
    console.error('[auth] Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ── GET /api/auth/google ──────────────────────────────────────────────────────
router.get('/google', (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_REDIRECT_URI) {
    return res.status(503).json({ error: 'Google OAuth is not configured on this server.' });
  }

  const params = new URLSearchParams({
    client_id:     GOOGLE_CLIENT_ID,
    redirect_uri:  GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope:         'openid email profile',
    access_type:   'online',
    prompt:        'select_account',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// ── GET /api/auth/google/callback ─────────────────────────────────────────────
router.get('/google/callback', async (req: Request, res: Response) => {
  const { code, error: oauthError } = req.query as Record<string, string>;

  const frontendUrl = process.env.FRONTEND_URL || '';

  function redirectError(msg: string) {
    const target = frontendUrl || '/';
    return res.redirect(`${target}?auth_error=${encodeURIComponent(msg)}`);
  }

  if (oauthError || !code) {
    return redirectError('Google sign-in was cancelled or failed.');
  }

  try {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri:  GOOGLE_REDIRECT_URI,
      grant_type:    'authorization_code',
    });

    const { access_token } = tokenRes.data;

    const profileRes = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = profileRes.data as {
      id: string;
      email: string;
      name?: string;
      given_name?: string;
    };

    if (!profile.id || !profile.email) {
      return redirectError('Could not retrieve Google profile.');
    }

    const user = await upsertUserAndWallet({
      googleId:  profile.id,
      email:     profile.email,
      firstName: profile.given_name || profile.name || null,
    });

    const token = generateJWT(0, user.id);
    const userPayload = encodeURIComponent(JSON.stringify({
      id:        user.id,
      email:     user.email,
      firstName: user.first_name,
      kycStatus: user.kyc_status,
      isActive:  user.is_active,
    }));

    const target = frontendUrl || '';
    res.redirect(`${target}/?auth_token=${token}&auth_user=${userPayload}`);
  } catch (err) {
    console.error('[auth] Google callback error:', err);
    return redirectError('Google authentication failed. Please try again.');
  }
});

// ── POST /api/auth/admin/login ────────────────────────────────────────────────
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
