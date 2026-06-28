import { Router, Response } from 'express';
import crypto from 'crypto';
import pool from '../db';
import { requireAuth, requireUUID, AuthRequest } from '../middleware/auth';
import { sendTelegramMessage, buildKycApprovalMessage, buildKycRejectionMessage } from '../services/telegramNotify';

const router = Router();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-aes-256-key-32-chars-here!!';

const AUTO_APPROVE = process.env.KYC_AUTO_APPROVE !== 'false';

function hashField(value: string): string {
  return crypto.createHash('sha256').update(value.trim() + ENCRYPTION_KEY).digest('hex');
}

function generateVirtualAccount() {
  const acctNum = `${Math.floor(Math.random() * 9000000000) + 1000000000}`;
  const banks = ['Wema Bank', 'Sterling Bank', 'Moniepoint', 'Providus Bank', 'Kuda Bank'];
  const bankName = banks[Math.floor(Math.random() * banks.length)];
  return { acctNum, bankName };
}

async function provisionVirtualAccount(userId: string, client: any) {
  const walletResult = await client.query(
    'SELECT id, virtual_account_number FROM wallets WHERE user_id = $1 AND currency = $2',
    [userId, 'NGN']
  );
  if (walletResult.rows.length > 0 && !walletResult.rows[0].virtual_account_number) {
    const { acctNum, bankName } = generateVirtualAccount();
    await client.query(
      'UPDATE wallets SET virtual_account_number = $1, virtual_bank_name = $2, updated_at = NOW() WHERE id = $3',
      [acctNum, bankName, walletResult.rows[0].id]
    );
    return { acctNum, bankName };
  }
  return null;
}

router.get('/status', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  try {
    const user = await pool.query(
      'SELECT kyc_status, kyc_rejection_reason FROM users WHERE id = $1',
      [req.user!.userId]
    );
    const kyc = await pool.query(
      `SELECT full_name, date_of_birth, liveness_score, verified_at, country, id_type
       FROM user_kyc WHERE user_id = $1`,
      [req.user!.userId]
    );
    res.json({
      kycStatus: user.rows[0]?.kyc_status,
      rejectionReason: user.rows[0]?.kyc_rejection_reason,
      kyc: kyc.rows[0] || null,
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/tier1', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      fullName, dateOfBirth,
      country = 'NG',
      idType = 'BVN_NIN',
      idNumber,
      bvn, nin,
    } = req.body;

    console.log('[KYC tier1] body:', { fullName: fullName ? fullName.slice(0,4)+'…' : '(empty)', dateOfBirth, country, idType, hasIdNumber: !!idNumber, hasBvn: !!bvn, hasNin: !!nin });

    if (!fullName?.trim()) {
      return res.status(400).json({ error: 'Full legal name is required.' });
    }
    if (!dateOfBirth) {
      return res.status(400).json({ error: 'Date of birth is required. Use YYYY-MM-DD format (e.g. 1999-11-25).' });
    }
    if (!country) {
      return res.status(400).json({ error: 'Country of residence is required.' });
    }

    const isNigerian = country === 'NG';
    if (isNigerian && idType === 'BVN_NIN' && !bvn && !nin) {
      return res.status(400).json({ error: 'BVN or NIN is required for Nigerian users.' });
    }
    if (!isNigerian && !idNumber?.trim()) {
      return res.status(400).json({ error: 'Document/ID number is required.' });
    }

    await client.query('BEGIN');

    const bvnHash = bvn ? hashField(bvn) : null;
    const ninHash = nin ? hashField(nin) : null;
    const idNumberHash = idNumber ? hashField(idNumber) : null;

    const existing = await client.query(
      'SELECT id FROM user_kyc WHERE user_id = $1',
      [req.user!.userId]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE user_kyc
         SET bvn_hash=$1, nin_hash=$2, full_name=$3, date_of_birth=$4,
             country=$5, id_type=$6, id_number_hash=$7, updated_at=NOW()
         WHERE user_id=$8`,
        [bvnHash, ninHash, fullName.trim(), dateOfBirth, country, idType, idNumberHash, req.user!.userId]
      );
    } else {
      await client.query(
        `INSERT INTO user_kyc
           (user_id, bvn_hash, nin_hash, full_name, date_of_birth, country, id_type, id_number_hash)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [req.user!.userId, bvnHash, ninHash, fullName.trim(), dateOfBirth, country, idType, idNumberHash]
      );
    }

    const newStatus = AUTO_APPROVE ? 'TIER_1' : 'PENDING_REVIEW';
    await client.query(
      'UPDATE users SET kyc_status=$1, kyc_rejection_reason=NULL WHERE id=$2',
      [newStatus, req.user!.userId]
    );

    if (AUTO_APPROVE) {
      await provisionVirtualAccount(req.user!.userId, client);
    }

    await client.query('COMMIT');

    // Fire-and-forget Telegram notification
    if (AUTO_APPROVE) {
      pool.query('SELECT telegram_id FROM users WHERE id = $1', [req.user!.userId])
        .then(r => {
          const tgId = r.rows[0]?.telegram_id;
          if (tgId) sendTelegramMessage(tgId, buildKycApprovalMessage('TIER_1'));
        })
        .catch(() => {});
    }

    const message = AUTO_APPROVE
      ? 'Identity verified! Gold Card tier unlocked. Your virtual account is ready.'
      : 'Submission received! Your identity is under review — usually within 24 hours.';

    res.json({ success: true, message, kycStatus: newStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[KYC tier1]', err);
    res.status(500).json({ error: 'KYC submission failed. Please try again.' });
  } finally {
    client.release();
  }
});

router.post('/tier2', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { documentUrl, livenessScore } = req.body;
    if (!documentUrl) {
      return res.status(400).json({ error: 'Document URL is required.' });
    }

    const userResult = await pool.query(
      'SELECT kyc_status FROM users WHERE id = $1',
      [req.user!.userId]
    );
    const kycStatus = userResult.rows[0]?.kyc_status;
    if (!['TIER_1'].includes(kycStatus)) {
      return res.status(400).json({ error: 'Complete Tier 1 verification before upgrading.' });
    }

    await client.query('BEGIN');

    const kycRow = await client.query('SELECT id FROM user_kyc WHERE user_id = $1', [req.user!.userId]);
    if (kycRow.rows.length > 0) {
      await client.query(
        'UPDATE user_kyc SET id_document_url=$1, liveness_score=$2, verified_at=NOW() WHERE user_id=$3',
        [documentUrl, livenessScore ?? 85, req.user!.userId]
      );
    }

    const newStatus = AUTO_APPROVE ? 'TIER_2' : 'PENDING_REVIEW';
    await client.query('UPDATE users SET kyc_status=$1 WHERE id=$2', [newStatus, req.user!.userId]);

    await client.query('COMMIT');

    const message = AUTO_APPROVE
      ? 'Advanced verification complete! Platinum Card tier unlocked.'
      : 'Document submitted. Under review — usually 24–48 hours.';

    res.json({ success: true, message, kycStatus: newStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[KYC tier2]', err);
    res.status(500).json({ error: 'KYC upgrade failed. Please try again.' });
  } finally {
    client.release();
  }
});

export default router;
