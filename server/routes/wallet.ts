import { Router, Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { requireAuth, requireUUID, AuthRequest } from '../middleware/auth';
import { fetchProviderBalance, verifyProviderWebhookSignature } from '../services/providerBalance';
import { sendTelegramMessage, buildCreditMessage } from '../services/telegramNotify';

const router = Router();

/**
 * GET /api/wallet
 *
 * Returns all wallets for the user.
 * Balance is ALWAYS computed from the double-entry ledger (sum of credits − debits).
 * If the stored wallets.balance diverges from the ledger total, it is corrected
 * automatically and the discrepancy is logged.
 * If a provider API key is configured, the authoritative provider balance is
 * fetched and returned alongside the ledger balance for reconciliation.
 */
router.get('/', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const wallets = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1',
      [req.user!.userId]
    );

    const enriched = await Promise.all(
      wallets.rows.map(async (wallet: any) => {
        // 1. Compute balance from ledger (source of truth)
        const ledgerResult = await client.query(
          `SELECT
             COALESCE(SUM(CASE WHEN credit_wallet_id = $1 THEN amount ELSE 0 END), 0)
           - COALESCE(SUM(CASE WHEN debit_wallet_id  = $1 THEN amount ELSE 0 END), 0)
           AS ledger_balance
           FROM ledger_entries
           WHERE credit_wallet_id = $1 OR debit_wallet_id = $1`,
          [wallet.id]
        );
        const ledgerBalance = Number(ledgerResult.rows[0]?.ledger_balance ?? 0);

        // 2. Detect & auto-correct stored balance drift
        const storedBalance = Number(wallet.balance);
        if (Math.abs(storedBalance - ledgerBalance) > 0.001) {
          console.warn(
            `[wallet reconcile] wallet ${wallet.id}: stored=${storedBalance} ledger=${ledgerBalance} — correcting`
          );
          await client.query(
            'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
            [ledgerBalance, wallet.id]
          );
          wallet.balance = ledgerBalance;
        } else {
          wallet.balance = ledgerBalance;
        }

        // 3. Optionally fetch provider balance for display/audit
        let providerData = null;
        if (wallet.virtual_account_number) {
          providerData = await fetchProviderBalance(
            wallet.virtual_account_number,
            wallet.currency
          );
        }

        return {
          ...wallet,
          balance: ledgerBalance,
          ledger_balance: ledgerBalance,
          provider_balance: providerData?.available ?? null,
          provider_ledger_balance: providerData?.ledger ?? null,
          provider_name: providerData?.provider ?? null,
          balance_synced_at: providerData?.fetchedAt ?? null,
          balance_source: providerData ? 'provider+ledger' : 'ledger',
        };
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('Wallet fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/wallet/transactions/:id
 * Returns full details for a single ledger entry (owned by the requesting user).
 */
router.get('/transactions/:id', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const wallets = await pool.query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
    const walletIds = wallets.rows.map((w: any) => w.id);
    if (!walletIds.length) return res.status(404).json({ error: 'Transaction not found' });

    const result = await pool.query(
      `SELECT le.*,
         dw.currency as debit_currency,
         cw.currency as credit_currency,
         dw.virtual_account_number as debit_account,
         cw.virtual_account_number as credit_account,
         dw.virtual_bank_name as debit_bank,
         cw.virtual_bank_name as credit_bank
       FROM ledger_entries le
       LEFT JOIN wallets dw ON le.debit_wallet_id  = dw.id
       LEFT JOIN wallets cw ON le.credit_wallet_id = cw.id
       WHERE le.id = $1
         AND (le.debit_wallet_id = ANY($2) OR le.credit_wallet_id = ANY($2))`,
      [id, walletIds]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Transaction not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Transaction detail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/wallet/transactions
 * Returns the last 50 ledger entries for all user wallets.
 */
router.get('/transactions', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
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
       LEFT JOIN wallets dw ON le.debit_wallet_id  = dw.id
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

/**
 * POST /api/wallet/fund  (manual / sandbox funding)
 * Idempotent — duplicate references are silently ignored.
 */
router.post('/fund', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { amount, currency = 'NGN', reference } = req.body;
    if (!amount || !reference) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // KYC enforcement — PENDING users cannot transact
    const kycResult = await pool.query('SELECT kyc_status FROM users WHERE id = $1', [req.user!.userId]);
    const kyc = kycResult.rows[0]?.kyc_status;
    if (!kyc || kyc === 'PENDING') {
      return res.status(403).json({ error: 'Complete identity verification (KYC) before making transactions.' });
    }
    if (kyc === 'BANNED') {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
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
      `INSERT INTO ledger_entries
         (transaction_reference, credit_wallet_id, amount, purpose, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        reference,
        wallet.id,
        amount,
        'WALLET_FUNDING',
        JSON.stringify({ source: 'manual', currency }),
      ]
    );

    await client.query('COMMIT');

    // Fire-and-forget Telegram notification
    const newBalance = Number(wallet.balance) + Number(amount);
    pool.query('SELECT telegram_id FROM users WHERE id = $1', [req.user!.userId])
      .then(r => {
        const tgId = r.rows[0]?.telegram_id;
        if (tgId) {
          sendTelegramMessage(tgId, buildCreditMessage({
            amount: Number(amount),
            currency,
            newBalance,
            reference,
            source: 'Manual / Sandbox',
            accountNumber: wallet.virtual_account_number,
            bankName: wallet.virtual_bank_name,
          }));
        }
      })
      .catch(() => {});

    res.json({ success: true, message: 'Wallet funded successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Fund error:', err);
    res.status(500).json({ error: 'Transaction failed' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/wallet/webhook/funding
 *
 * Receives inbound transfer notifications from the virtual account provider
 * (Mono, Sudo Africa, Flutterwave, etc.).
 *
 * Security:
 *   - HMAC-SHA256 signature checked against WEBHOOK_SECRET env var.
 *   - Idempotency: duplicate transaction_reference values are silently ignored.
 *   - Row-level FOR UPDATE lock prevents double-crediting under concurrent calls.
 */
router.post('/webhook/funding', async (req: Request, res: Response) => {
  // Signature verification
  const rawBody = JSON.stringify(req.body);
  const sig =
    (req.headers['x-sudo-signature'] ||
      req.headers['mono-webhook-secret'] ||
      req.headers['verif-hash'] ||
      req.headers['x-flw-signature']) as string | undefined;

  if (!verifyProviderWebhookSignature(rawBody, sig)) {
    console.warn('[webhook] Invalid signature — rejected');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const client = await pool.connect();
  try {
    // Normalise payload across providers
    const body = req.body;

    // Sudo Africa shape
    const reference =
      body.data?.reference ||
      body.reference ||
      body.data?.transactionReference;

    const rawAmount =
      body.data?.amount ?? body.amount ?? body.data?.settlementAmount;

    // Sudo sends kobo; Mono sends kobo; Flutterwave sends naira — detect by provider header
    const isSudo = !!req.headers['x-sudo-signature'];
    const isMono = !!req.headers['mono-webhook-secret'];
    const amount = isSudo || isMono
      ? Number(rawAmount) / 100   // kobo → naira
      : Number(rawAmount);        // already naira

    const accountNumber =
      body.data?.destinationAccountNumber ||
      body.data?.account?.accountNumber ||
      body.account_number;

    const currency = body.data?.currency || body.currency || 'NGN';

    if (!reference || !amount || !accountNumber) {
      return res.status(400).json({ error: 'Missing required webhook fields' });
    }

    // Idempotency check
    const existingRef = await pool.query(
      'SELECT id FROM ledger_entries WHERE transaction_reference = $1',
      [reference]
    );
    if (existingRef.rows.length > 0) {
      return res.status(200).json({ message: 'Already processed', idempotent: true });
    }

    await client.query('BEGIN');

    const walletResult = await client.query(
      `SELECT w.* FROM wallets w
       WHERE w.virtual_account_number = $1 AND w.currency = $2
       FOR UPDATE`,
      [accountNumber, currency]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) {
      await client.query('ROLLBACK');
      console.warn(`[webhook] No wallet for account ${accountNumber}`);
      return res.status(404).json({ error: 'Account not found' });
    }

    // Credit wallet + ledger entry
    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    );

    const provider = isSudo ? 'sudo' : isMono ? 'mono' : 'flutterwave';
    await client.query(
      `INSERT INTO ledger_entries
         (transaction_reference, credit_wallet_id, amount, purpose, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        reference,
        wallet.id,
        amount,
        'WALLET_FUNDING',
        JSON.stringify({
          source: 'webhook',
          provider,
          raw_amount: rawAmount,
          account_number: accountNumber,
          currency,
        }),
      ]
    );

    await client.query('COMMIT');
    console.log(`[webhook] Credited ₦${amount} to wallet ${wallet.id} (ref: ${reference})`);

    // Fire-and-forget Telegram notification
    const newBalance = Number(wallet.balance) + Number(amount);
    pool.query('SELECT telegram_id FROM users WHERE id = $1', [wallet.user_id])
      .then(r => {
        const tgId = r.rows[0]?.telegram_id;
        if (tgId) {
          sendTelegramMessage(tgId, buildCreditMessage({
            amount,
            currency,
            newBalance,
            reference,
            source: `${provider.charAt(0).toUpperCase() + provider.slice(1)} webhook`,
            accountNumber: wallet.virtual_account_number,
            bankName: wallet.virtual_bank_name,
          }));
        }
      })
      .catch(() => {});

    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[webhook] Processing failed:', err);
    res.status(500).json({ error: 'Processing failed' });
  } finally {
    client.release();
  }
});

export default router;
