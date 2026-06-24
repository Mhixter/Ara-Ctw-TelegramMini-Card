import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fintech-secret-key-dev-2024';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export interface AuthRequest extends Request {
  user?: { telegramId: number; userId?: string; role?: string };
}

export function verifyTelegramInitData(initData: string): { telegramId: number; username?: string; firstName?: string } | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) return null;

    urlParams.delete('hash');
    const dataCheckArr = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => `${key}=${val}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckArr).digest('hex');

    if (computedHash !== hash) return null;

    const userStr = urlParams.get('user');
    if (!userStr) return null;
    const user = JSON.parse(userStr);
    return { telegramId: user.id, username: user.username, firstName: user.first_name };
  } catch {
    return null;
  }
}

export function generateJWT(telegramId: number, userId?: string, role?: string): string {
  return jwt.sign({ telegramId, userId, role }, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyJWT(token: string): { telegramId: number; userId?: string; role?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { telegramId: number; userId?: string; role?: string };
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload) return res.status(401).json({ error: 'Invalid token' });
  req.user = payload;
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.slice(7);
  const payload = verifyJWT(token);
  if (!payload || !payload.role) return res.status(401).json({ error: 'Admin access required' });
  req.user = payload;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
