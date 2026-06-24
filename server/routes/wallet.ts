import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const wallets = await pool.query('SELECT * FROM wallets WHERE user_id = $1', [req.user!.userId]);
    res.json(wallets.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/transactions', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const wallets = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
    const walletIds = wallets.rows.map((w: any) => w.id);
    if (!walletIds.length) return res.json([]);

    const txns = await pool.query(
      `SELECT le.*, 
        dw.currency as debit_currency, 
        cw.currency as credit_currency
       FROM ledger_entries le
       LEFT JOIN wallets dw ON le.debit_wallet_id = dw.id
       LEFT JOIN wallets cw ON le.credit_wallet_id = cw.id
       WHERE le.debit_wallet_id = ANY($1) OR le.credit_wallet_id = ANY($1)
       ORDER BY le.created_at DESC LIMIT 50`,
      [walletIds]
    );
    res.json(txns.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/fund', requireAuth, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { amount, currency, reference } = req.body;
    if (!amount || !currency || !reference) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existingRef = await pool.query(
      'SELECT id FROM ledger_entries WHERE transaction_reference = $1',
      [reference]
    );
    if (existingRef.rows.length > 0) {
      return res.status(200).json({ message: 'Already processed', idempotent: true });
    }

    await client.query('BEGIN');
    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1 AND currency = $2 FOR UPDATE',
      [req.user!.userId, currency]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) throw new Error('Wallet not found');

    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    );

    await client.query(
      'INSERT INTO ledger_entries (transaction_reference, credit_wallet_id, amount, purpose, metadata) VALUES ($1, $2, $3, $4, $5)',
      [reference, wallet.id, amount, 'WALLET_FUNDING', JSON.stringify({ source: 'manual', currency })]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Wallet funded successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Fund error:', err);
    res.status(500).json({ error: 'Transaction failed' });
  } finally {
    client.release();
  }
});

router.post('/webhook/funding', async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { reference, amount, currency, account_number } = req.body;
    if (!reference) return res.status(400).json({ error: 'Missing reference' });

    const existingRef = await pool.query(
      'SELECT id FROM ledger_entries WHERE transaction_reference = $1',
      [reference]
    );
    if (existingRef.rows.length > 0) {
      return res.status(200).json({ message: 'Already processed' });
    }

    await client.query('BEGIN');
    const walletResult = await client.query(
      'SELECT w.* FROM wallets w WHERE w.virtual_account_number = $1 AND w.currency = $2 FOR UPDATE',
      [account_number, currency || 'NGN']
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Account not found' });
    }

    await client.query('UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2', [amount, wallet.id]);
    await client.query(
      'INSERT INTO ledger_entries (transaction_reference, credit_wallet_id, amount, purpose, metadata) VALUES ($1, $2, $3, $4, $5)',
      [reference, wallet.id, amount, 'WALLET_FUNDING', JSON.stringify({ source: 'webhook', provider: 'mono' })]
    );

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Processing failed' });
  } finally {
    client.release();
  }
});

export default router;
