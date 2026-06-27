import { Router, Response } from 'express';
import crypto from 'crypto';
import pool from '../db';
import { requireAuth, requireUUID, AuthRequest } from '../middleware/auth';

const router = Router();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-aes-256-key-32-chars-here!!';

function encrypt(text: string): string {
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function hashField(value: string): string {
  return crypto.createHash('sha256').update(value + ENCRYPTION_KEY).digest('hex');
}

router.get('/status', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  try {
    const user = await pool.query('SELECT kyc_status FROM users WHERE id = $1', [req.user!.userId]);
    const kyc = await pool.query('SELECT full_name, date_of_birth, liveness_score, verified_at FROM user_kyc WHERE user_id = $1', [req.user!.userId]);
    res.json({ kycStatus: user.rows[0]?.kyc_status, kyc: kyc.rows[0] || null });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/tier1', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { bvn, nin, fullName, dateOfBirth } = req.body;
    if (!bvn || !nin || !fullName || !dateOfBirth) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await client.query('BEGIN');

    const bvnHash = hashField(bvn);
    const ninHash = hashField(nin);

    const existing = await client.query('SELECT id FROM user_kyc WHERE user_id = $1', [req.user!.userId]);
    if (existing.rows.length > 0) {
      await client.query(
        'UPDATE user_kyc SET bvn_hash = $1, nin_hash = $2, full_name = $3, date_of_birth = $4 WHERE user_id = $5',
        [bvnHash, ninHash, fullName, dateOfBirth, req.user!.userId]
      );
    } else {
      await client.query(
        'INSERT INTO user_kyc (user_id, bvn_hash, nin_hash, full_name, date_of_birth) VALUES ($1, $2, $3, $4, $5)',
        [req.user!.userId, bvnHash, ninHash, fullName, dateOfBirth]
      );
    }

    await client.query(
      'UPDATE users SET kyc_status = $1 WHERE id = $2',
      ['TIER_1', req.user!.userId]
    );

    const walletResult = await client.query(
      'SELECT id FROM wallets WHERE user_id = $1 AND currency = $2',
      [req.user!.userId, 'NGN']
    );
    if (walletResult.rows.length > 0) {
      const acctNum = `${Math.floor(Math.random() * 9000000000) + 1000000000}`;
      const banks = ['Wema Bank', 'Sterling Bank', 'Moniepoint'];
      const bankName = banks[Math.floor(Math.random() * banks.length)];
      await client.query(
        'UPDATE wallets SET virtual_account_number = $1, virtual_bank_name = $2 WHERE id = $3',
        [acctNum, bankName, walletResult.rows[0].id]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: 'Tier 1 KYC verified. Gold Card tier unlocked!', kycStatus: 'TIER_1' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('KYC Tier1 error:', err);
    res.status(500).json({ error: 'KYC verification failed' });
  } finally {
    client.release();
  }
});

router.post('/tier2', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { documentUrl, livenessScore } = req.body;
    if (!documentUrl || livenessScore === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await client.query('BEGIN');

    await client.query(
      'UPDATE user_kyc SET id_document_url = $1, liveness_score = $2, verified_at = NOW() WHERE user_id = $3',
      [documentUrl, livenessScore, req.user!.userId]
    );

    await client.query('UPDATE users SET kyc_status = $1 WHERE id = $2', ['TIER_2', req.user!.userId]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Tier 2 KYC verified. Platinum Card tier unlocked!', kycStatus: 'TIER_2' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'KYC upgrade failed' });
  } finally {
    client.release();
  }
});

export default router;
