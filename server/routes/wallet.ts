import { Router, Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { requireAuth, requireUUID, AuthRequest } from '../middleware/auth';
import { fetchProviderBalance, verifyProviderWebhookSignature } from '../services/providerBalance';
import { sendTelegramMessage, buildCreditMessage } from '../services/telegramNotify';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet/users/search?q=<username>
// Search for a BorderPay user by Telegram username (for P2P send)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/users/search', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  try {
    const q = String(req.query.q || '').trim().replace(/^@/, '').toLowerCase();
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query too short (min 2 chars).' });
    }

    const result = await pool.query(
      `SELECT id, first_name, username, kyc_status, is_active
         FROM users
        WHERE LOWER(username) = $1
          AND is_active = true
        LIMIT 1`,
      [q]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'User not found. They must sign into BorderPay first.' });
    }

    const found = result.rows[0];

    // Prevent self-send
    if (found.id === req.user!.userId) {
      return res.status(400).json({ error: 'You cannot send money to yourself.' });
    }

    res.json({
      user: {
        userId:    found.id,
        firstName: found.first_name,
        username:  found.username,
        kycStatus: found.kyc_status,
      },
    });
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/send
// Telegram-to-Telegram P2P transfer (NGN only, within BorderPay wallets)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { recipientUserId, amount, note } = req.body;
    const senderUserId = req.user!.userId;

    if (!recipientUserId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'recipientUserId and a positive amount are required.' });
    }
    if (recipientUserId === senderUserId) {
      return res.status(400).json({ error: 'You cannot send money to yourself.' });
    }
    if (Number(amount) > 5_000_000) {
      return res.status(400).json({ error: 'Single transfer limit is ₦5,000,000.' });
    }

    // KYC check — sender must be verified
    const kycRes = await pool.query('SELECT kyc_status FROM users WHERE id = $1', [senderUserId]);
    const kyc = kycRes.rows[0]?.kyc_status;
    if (!kyc || kyc === 'PENDING') {
      return res.status(403).json({ error: 'Complete identity verification (KYC) before sending money.' });
    }
    if (kyc === 'BANNED') {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
    }

    await client.query('BEGIN');

    // Lock both wallets (ordered by UUID to avoid deadlock)
    const walletIds = [senderUserId, recipientUserId].sort();
    const walletsRes = await client.query(
      `SELECT w.*, u.first_name, u.username, u.telegram_id
         FROM wallets w
         JOIN users u ON u.id = w.user_id
        WHERE w.user_id = ANY($1::uuid[]) AND w.currency = 'NGN'
        ORDER BY w.user_id
        FOR UPDATE`,
      [walletIds]
    );

    const senderWallet    = walletsRes.rows.find((w: any) => w.user_id === senderUserId);
    const recipientWallet = walletsRes.rows.find((w: any) => w.user_id === recipientUserId);

    if (!senderWallet) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Your NGN wallet not found.' });
    }
    if (!recipientWallet) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipient does not have a BorderPay wallet.' });
    }

    // Recompute sender ledger balance for accuracy
    const ledgerRes = await client.query(
      `SELECT
         COALESCE(SUM(CASE WHEN credit_wallet_id = $1 THEN amount ELSE 0 END), 0)
       - COALESCE(SUM(CASE WHEN debit_wallet_id  = $1 THEN amount ELSE 0 END), 0)
       AS ledger_balance
       FROM ledger_entries
       WHERE credit_wallet_id = $1 OR debit_wallet_id = $1`,
      [senderWallet.id]
    );
    const senderBalance = Number(ledgerRes.rows[0]?.ledger_balance ?? 0);

    if (senderBalance < Number(amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Insufficient funds. Available: ₦${senderBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      });
    }

    const reference = `P2P-${uuidv4()}`;
    const senderName    = senderWallet.first_name    || senderWallet.username    || 'BorderPay User';
    const recipientName = recipientWallet.first_name || recipientWallet.username || 'BorderPay User';

    const meta = JSON.stringify({
      type: 'P2P',
      note: note || null,
      senderName,
      recipientName,
      senderUsername:    senderWallet.username,
      recipientUsername: recipientWallet.username,
    });

    // Double-entry: debit sender, credit recipient
    await client.query(
      `INSERT INTO ledger_entries
         (transaction_reference, debit_wallet_id, credit_wallet_id, amount, purpose, metadata)
       VALUES ($1, $2, $3, $4, 'P2P_SEND', $5)`,
      [reference, senderWallet.id, recipientWallet.id, amount, meta]
    );

    // Update stored balances
    await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
      [amount, senderWallet.id]
    );
    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, recipientWallet.id]
    );

    await client.query('COMMIT');

    // ── Telegram notifications (fire-and-forget) ──────────────────────────
    const amtFmt = Number(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 });
    const noteStr = note ? `\n📝 <b>Note:</b> ${note}` : '';

    // Notify recipient
    if (recipientWallet.telegram_id) {
      const newRecipientBal = Number(recipientWallet.balance) + Number(amount);
      sendTelegramMessage(
        recipientWallet.telegram_id,
        [
          `💸 <b>Money Received!</b>`,
          ``,
          `💰 <b>Amount:</b> ₦${amtFmt}`,
          `👤 <b>From:</b> ${senderName}${senderWallet.username ? ` (@${senderWallet.username})` : ''}`,
          `📊 <b>New Balance:</b> ₦${newRecipientBal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          noteStr,
          `🔑 <b>Ref:</b> <code>${reference}</code>`,
          ``,
          `<i>BorderPay — cross-border payments, simplified.</i>`,
        ].filter(Boolean).join('\n')
      ).catch(() => {});
    }

    // Notify sender
    if (senderWallet.telegram_id) {
      const newSenderBal = senderBalance - Number(amount);
      sendTelegramMessage(
        senderWallet.telegram_id,
        [
          `✅ <b>Transfer Sent</b>`,
          ``,
          `💰 <b>Amount:</b> ₦${amtFmt}`,
          `👤 <b>To:</b> ${recipientName}${recipientWallet.username ? ` (@${recipientWallet.username})` : ''}`,
          `📊 <b>New Balance:</b> ₦${newSenderBal.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
          noteStr,
          `🔑 <b>Ref:</b> <code>${reference}</code>`,
          ``,
          `<i>BorderPay — cross-border payments, simplified.</i>`,
        ].filter(Boolean).join('\n')
      ).catch(() => {});
    }

    res.json({ success: true, reference, amount: Number(amount), recipientName });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('P2P send error:', err);
    res.status(500).json({ error: 'Transfer failed. Please try again.' });
  } finally {
    client.release();
  }
});

/**
 * GET /api/wallet
 * Returns all wallets for the user with ledger-reconciled balances.
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

        const storedBalance = Number(wallet.balance);
        if (Math.abs(storedBalance - ledgerBalance) > 0.001) {
          console.warn(`[wallet reconcile] wallet ${wallet.id}: stored=${storedBalance} ledger=${ledgerBalance} — correcting`);
          await client.query(
            'UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2',
            [ledgerBalance, wallet.id]
          );
          wallet.balance = ledgerBalance;
        } else {
          wallet.balance = ledgerBalance;
        }

        let providerData = null;
        if (wallet.virtual_account_number) {
          providerData = await fetchProviderBalance(wallet.virtual_account_number, wallet.currency);
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
         AND (le.debit_wallet_id = ANY($2::uuid[]) OR le.credit_wallet_id = ANY($2::uuid[]))`,
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
       WHERE le.debit_wallet_id = ANY($1::uuid[]) OR le.credit_wallet_id = ANY($1::uuid[])
       ORDER BY le.created_at DESC LIMIT 50`,
      [walletIds]
    );
    res.json(txns.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/wallet/fund  (manual funding via virtual account or admin credit)
 */
router.post('/fund', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { amount, currency = 'NGN', reference } = req.body;
    if (!amount || !reference) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
      [reference, wallet.id, amount, 'WALLET_FUNDING', JSON.stringify({ source: 'manual', currency })]
    );

    await client.query('COMMIT');

    const newBalance = Number(wallet.balance) + Number(amount);
    pool.query('SELECT telegram_id FROM users WHERE id = $1', [req.user!.userId])
      .then(r => {
        const tgId = r.rows[0]?.telegram_id;
        if (tgId) {
          sendTelegramMessage(tgId, buildCreditMessage({
            amount: Number(amount), currency, newBalance, reference,
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
 * Inbound transfer webhook from virtual account providers (Sudo Africa / PayPoint).
 */
router.post('/webhook/funding', async (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body);
  const sig =
    (req.headers['x-sudo-signature'] ||
      req.headers['x-paypoint-signature'] ||
      req.headers['mono-webhook-secret'] ||
      req.headers['verif-hash'] ||
      req.headers['x-flw-signature']) as string | undefined;

  if (!verifyProviderWebhookSignature(rawBody, sig)) {
    console.warn('[webhook] Invalid signature — rejected');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const client = await pool.connect();
  try {
    const body = req.body;

    const reference =
      body.data?.reference ||
      body.reference ||
      body.data?.transactionReference ||
      body.data?.transaction_reference;

    const rawAmount =
      body.data?.amount ?? body.amount ?? body.data?.settlementAmount;

    const isSudo     = !!req.headers['x-sudo-signature'];
    const isMono     = !!req.headers['mono-webhook-secret'];
    const isPayPoint = !!req.headers['x-paypoint-signature'];
    const amount = (isSudo || isMono || isPayPoint)
      ? Number(rawAmount) / 100   // kobo → naira
      : Number(rawAmount);        // already naira

    const accountNumber =
      body.data?.destinationAccountNumber ||
      body.data?.account?.accountNumber ||
      body.data?.account_number ||
      body.account_number;

    const currency = body.data?.currency || body.currency || 'NGN';

    if (!reference || !amount || !accountNumber) {
      return res.status(400).json({ error: 'Missing required webhook fields' });
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

    await client.query(
      'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    );

    const provider = isSudo ? 'sudo' : isMono ? 'mono' : isPayPoint ? 'paypoint' : 'flutterwave';
    await client.query(
      `INSERT INTO ledger_entries
         (transaction_reference, credit_wallet_id, amount, purpose, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        reference, wallet.id, amount, 'WALLET_FUNDING',
        JSON.stringify({ source: 'webhook', provider, raw_amount: rawAmount, account_number: accountNumber, currency }),
      ]
    );

    await client.query('COMMIT');
    console.log(`[webhook] Credited ₦${amount} to wallet ${wallet.id} (ref: ${reference})`);

    const newBalance = Number(wallet.balance) + Number(amount);
    pool.query('SELECT telegram_id FROM users WHERE id = $1', [wallet.user_id])
      .then(r => {
        const tgId = r.rows[0]?.telegram_id;
        if (tgId) {
          sendTelegramMessage(tgId, buildCreditMessage({
            amount, currency, newBalance, reference,
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
