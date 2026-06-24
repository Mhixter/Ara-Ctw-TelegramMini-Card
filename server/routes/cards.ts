import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const cards = await pool.query(
      'SELECT id, mask_pan, card_tier, card_brand, card_currency, daily_limit, monthly_limit, amount_spent_today, status, created_at FROM cards WHERE user_id = $1',
      [req.user!.userId]
    );
    res.json(cards.rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/issue', requireAuth, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { currency = 'NGN', brand = 'VISA' } = req.body;
    if (!['VISA', 'MASTERCARD'].includes(brand)) {
      return res.status(400).json({ error: 'Only VISA and MASTERCARD are supported' });
    }

    const userResult = await pool.query('SELECT kyc_status FROM users WHERE id = $1', [req.user!.userId]);
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.kyc_status === 'PENDING' || user.kyc_status === 'BANNED') {
      return res.status(403).json({ error: 'KYC verification required to issue cards' });
    }

    const tier = user.kyc_status === 'TIER_2' ? 'PLATINUM' : 'GOLD';
    const dailyLimit = tier === 'PLATINUM' ? 5000 : 500;
    const monthlyLimit = tier === 'PLATINUM' ? 50000 : 5000;

    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1 AND currency = $2 FOR UPDATE',
      [req.user!.userId, 'NGN']
    );
    const wallet = walletResult.rows[0];
    if (!wallet) return res.status(404).json({ error: 'NGN wallet not found' });

    const issuanceFee = 5000;
    if (Number(wallet.balance) < issuanceFee) {
      return res.status(400).json({ error: `Insufficient NGN balance. Card issuance fee: ₦${issuanceFee.toLocaleString()}` });
    }

    await client.query('BEGIN');

    await client.query('UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2', [issuanceFee, wallet.id]);

    const ref = `CARD-ISSUE-${uuidv4()}`;
    await client.query(
      'INSERT INTO ledger_entries (transaction_reference, debit_wallet_id, amount, purpose, metadata) VALUES ($1, $2, $3, $4, $5)',
      [ref, wallet.id, issuanceFee, 'CARD_ISSUANCE', JSON.stringify({ tier, brand, currency })]
    );

    const pan = `4111${Math.random().toString().slice(2, 8).padStart(6, '0')}${Math.floor(1000 + Math.random() * 9000)}`;
    const maskPan = `${pan.slice(0, 6)}XXXXXX${pan.slice(-4)}`;
    const providerCardId = uuidv4();
    const cardToken = `tok_${uuidv4().replace(/-/g, '')}`;

    const cardResult = await client.query(
      `INSERT INTO cards (user_id, provider_card_id, card_token, mask_pan, card_tier, card_brand, card_currency, daily_limit, monthly_limit, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE') RETURNING id, mask_pan, card_tier, card_brand, card_currency, daily_limit, monthly_limit, status, created_at`,
      [req.user!.userId, providerCardId, cardToken, maskPan, tier, brand, 'NGN', dailyLimit, monthlyLimit]
    );

    await client.query('COMMIT');
    res.json({ success: true, card: cardResult.rows[0], message: `${tier} card issued successfully!` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Card issue error:', err);
    res.status(500).json({ error: 'Card issuance failed' });
  } finally {
    client.release();
  }
});

router.patch('/:cardId/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { cardId } = req.params;
    const { status } = req.body;
    if (!['ACTIVE', 'FROZEN'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const result = await pool.query(
      'UPDATE cards SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING id, status',
      [status, cardId, req.user!.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Card not found' });
    res.json({ success: true, card: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:cardId/limits', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { cardId } = req.params;
    const { dailyLimit, monthlyLimit } = req.body;

    const cardResult = await pool.query(
      'SELECT c.*, u.kyc_status FROM cards c JOIN users u ON c.user_id = u.id WHERE c.id = $1 AND c.user_id = $2',
      [cardId, req.user!.userId]
    );
    const card = cardResult.rows[0];
    if (!card) return res.status(404).json({ error: 'Card not found' });

    const maxDaily = card.card_tier === 'PLATINUM' ? 5000 : 500;
    const maxMonthly = card.card_tier === 'PLATINUM' ? 50000 : 5000;

    if (dailyLimit > maxDaily || monthlyLimit > maxMonthly) {
      return res.status(400).json({ error: `Limits exceed tier maximum (Daily: $${maxDaily}, Monthly: $${maxMonthly})` });
    }

    const result = await pool.query(
      'UPDATE cards SET daily_limit = $1, monthly_limit = $2 WHERE id = $3 AND user_id = $4 RETURNING id, daily_limit, monthly_limit',
      [dailyLimit, monthlyLimit, cardId, req.user!.userId]
    );
    res.json({ success: true, card: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
