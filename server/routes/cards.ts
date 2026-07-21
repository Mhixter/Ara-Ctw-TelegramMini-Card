import { Router, Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { requireAuth, requireUUID, AuthRequest } from '../middleware/auth';
import { issueCard, createSudoCustomer, getCardDetails, updateCardStatus, verifyWebhookSignature, fundCard, assertSudoProductionReady } from '../services/sudoAfrica';
import { decryptField } from './kyc';

const router = Router();

// ── List user's cards ─────────────────────────────────────────────────────────
router.get('/', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  try {
    const cards = await pool.query(
      `SELECT id, provider_card_id, mask_pan, card_tier, card_brand, card_currency,
              daily_limit, monthly_limit, amount_spent_today, status, expiry, created_at
       FROM cards WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.userId]
    );
    res.json(cards.rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Get card details (PAN + one-time CVV from Sudo) ──────────────────────────
router.get('/:cardId/details', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  try {
    const { cardId } = req.params;
    const cardResult = await pool.query(
      'SELECT id, provider_card_id, mask_pan, card_brand, card_tier, status, expiry FROM cards WHERE id = $1 AND user_id = $2',
      [cardId, req.user!.userId]
    );
    const card = cardResult.rows[0];
    if (!card) return res.status(404).json({ error: 'Card not found' });
    if (card.status === 'TERMINATED') return res.status(400).json({ error: 'Card is terminated' });

    const details = await getCardDetails(card.provider_card_id);
    res.json({
      id:             card.id,
      maskPan:        details.maskPan,
      pan:            details.pan,       // full PAN from vault (null if not available)
      cvv:            details.cvv,
      expiry:         details.expiry || card.expiry,
      billingAddress: details.billingAddress,
      brand:          card.card_brand,
      tier:           card.card_tier,
      status:         card.status,
    });
  } catch (err: any) {
    console.error('Card details error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch card details' });
  }
});

// ── Issue a new card ──────────────────────────────────────────────────────────
router.post('/issue', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { currency = 'NGN', brand = 'VISA' } = req.body;
    if (!['VISA', 'MASTERCARD'].includes(brand)) {
      return res.status(400).json({ error: 'Only VISA and MASTERCARD are supported' });
    }

    // Brand-specific guard — ensures the funding source for THIS brand is set
    try { assertSudoProductionReady(brand as 'VISA' | 'MASTERCARD'); } catch (e: any) {
      client.release();
      return res.status(e.statusCode || 503).json({ error: e.message });
    }

    const userResult = await pool.query(
      'SELECT kyc_status, first_name, email, sudo_customer_id FROM users WHERE id = $1',
      [req.user!.userId]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.kyc_status === 'PENDING' || user.kyc_status === 'BANNED') {
      return res.status(403).json({ error: 'KYC verification required to issue cards' });
    }

    const tier = user.kyc_status === 'TIER_2' ? 'PLATINUM' : 'GOLD';
    const dailyLimit = tier === 'PLATINUM' ? 5000 : 500;
    const monthlyLimit = tier === 'PLATINUM' ? 50000 : 5000;

    // ── Resolve per-user Sudo customer ID ────────────────────────────────────
    // In production: create a Sudo customer on first card issuance, reuse after.
    // In sandbox mode: issueCard ignores the customerId, so any placeholder works.
    let sudoCustomerId: string = user.sudo_customer_id || '';

    if (!sudoCustomerId && process.env.CARD_ISSUER_API_KEY && process.env.SUDO_SANDBOX !== 'true') {
      // Prefer the shared business-level Sudo customer (SUDO_CUSTOMER_ID env var).
      if (process.env.SUDO_CUSTOMER_ID) {
        sudoCustomerId = process.env.SUDO_CUSTOMER_ID;
        // Persist so subsequent card issuances skip this check
        await pool.query(
          'UPDATE users SET sudo_customer_id = $1, updated_at = NOW() WHERE id = $2',
          [sudoCustomerId, req.user!.userId]
        );
      } else {
        // Create per-user Sudo customer using BVN + phone from KYC
        const kycRow = await pool.query(
          'SELECT bvn_encrypted, phone FROM user_kyc WHERE user_id = $1',
          [req.user!.userId]
        );
        const kyc = kycRow.rows[0];

        let bvn: string | undefined;
        let phone: string | undefined = kyc?.phone || undefined;

        if (kyc?.bvn_encrypted) {
          try { bvn = decryptField(kyc.bvn_encrypted); } catch { bvn = undefined; }
        }

        const nameParts = (user.first_name || 'BorderPay User').trim().split(/\s+/);
        const firstName = nameParts[0] || 'BorderPay';
        const lastName  = nameParts.slice(1).join(' ') || 'User';

        sudoCustomerId = await createSudoCustomer({
          firstName,
          lastName,
          email: user.email || undefined,
          phoneNumber: phone,
          bvn,
        });

        await pool.query(
          'UPDATE users SET sudo_customer_id = $1, updated_at = NOW() WHERE id = $2',
          [sudoCustomerId, req.user!.userId]
        );
      }
    }

    await client.query('BEGIN');

    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1 AND currency = $2 FOR UPDATE',
      [req.user!.userId, 'NGN']
    );
    const wallet = walletResult.rows[0];
    if (!wallet) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'NGN wallet not found' }); }

    const issuanceFee = 5000;
    if (Number(wallet.balance) < issuanceFee) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient NGN balance. Card issuance fee: ₦${issuanceFee.toLocaleString()}` });
    }

    // Debit issuance fee before calling Sudo (prevents partial state)
    await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
      [issuanceFee, wallet.id]
    );
    const feeRef = `CARD-ISSUE-${uuidv4()}`;
    await client.query(
      `INSERT INTO ledger_entries (transaction_reference, debit_wallet_id, amount, purpose, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [feeRef, wallet.id, issuanceFee, 'CARD_ISSUANCE', JSON.stringify({ tier, brand, currency })]
    );

    // Call Sudo Africa (or sandbox fallback)
    const sudoCard = await issueCard({
      brand: brand as 'VISA' | 'MASTERCARD',
      currency,
      tier: tier as 'GOLD' | 'PLATINUM',
      dailyLimit,
      monthlyLimit,
      userId:         String(req.user!.userId),
      sudoCustomerId,
    });

    const cardResult = await client.query(
      `INSERT INTO cards
         (user_id, provider_card_id, card_token, mask_pan, card_tier, card_brand, card_currency,
          daily_limit, monthly_limit, status, sudo_account_id, expiry)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'ACTIVE',$10,$11)
       RETURNING id, mask_pan, card_tier, card_brand, card_currency, daily_limit, monthly_limit, status, expiry, created_at`,
      [
        req.user!.userId,
        sudoCard.providerCardId,
        sudoCard.cardToken,
        sudoCard.maskPan,
        tier,
        (sudoCard.brand || brand).toUpperCase(),
        'NGN',
        dailyLimit,
        monthlyLimit,
        sudoCard.accountId || null,
        sudoCard.expiry    || null,
      ]
    );

    await client.query('COMMIT');
    res.json({ success: true, card: cardResult.rows[0], message: `${tier} card issued successfully!` });
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Card issue error:', err);
    res.status(500).json({ error: err.message || 'Card issuance failed' });
  } finally {
    client.release();
  }
});

// ── Simulate a card spend (sandbox / test) ────────────────────────────────────
router.post('/:cardId/spend', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const { cardId } = req.params;
    const { amount, merchant = 'Online Merchant' } = req.body;
    const spendAmount = Number(amount);
    if (!spendAmount || spendAmount <= 0) {
      return res.status(400).json({ error: 'Invalid spend amount' });
    }

    // KYC enforcement
    const kycResult = await pool.query('SELECT kyc_status FROM users WHERE id = $1', [req.user!.userId]);
    const kyc = kycResult.rows[0]?.kyc_status;
    if (!kyc || kyc === 'PENDING') {
      return res.status(403).json({ error: 'Complete identity verification (KYC) before making transactions.' });
    }
    if (kyc === 'BANNED') {
      return res.status(403).json({ error: 'Your account has been suspended. Contact support.' });
    }

    await client.query('BEGIN');

    const cardResult = await client.query(
      `SELECT c.*, DATE(c.updated_at) as last_reset_date
       FROM cards c WHERE c.id = $1 AND c.user_id = $2 FOR UPDATE`,
      [cardId, req.user!.userId]
    );
    const card = cardResult.rows[0];
    if (!card) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Card not found' }); }
    if (card.status !== 'ACTIVE') { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Card is frozen. Unfreeze before spending.' }); }

    // Daily reset
    const today = new Date().toISOString().slice(0, 10);
    const lastReset = card.last_reset_date ? new Date(card.last_reset_date).toISOString().slice(0, 10) : null;
    let spentToday = Number(card.amount_spent_today || 0);
    if (lastReset !== today) {
      spentToday = 0;
      await client.query('UPDATE cards SET amount_spent_today = 0 WHERE id = $1', [cardId]);
    }

    const dailyLimit = Number(card.daily_limit);
    if (spentToday + spendAmount > dailyLimit) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Daily limit exceeded. Remaining: ₦${(dailyLimit - spentToday).toLocaleString('en-NG')}`
      });
    }

    const walletResult = await client.query(
      'SELECT * FROM wallets WHERE user_id = $1 AND currency = $2 FOR UPDATE',
      [req.user!.userId, 'NGN']
    );
    const wallet = walletResult.rows[0];
    if (!wallet) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'NGN wallet not found' }); }
    if (Number(wallet.balance) < spendAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Insufficient balance. Available: ₦${Number(wallet.balance).toLocaleString('en-NG')}` });
    }

    await client.query('UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2', [spendAmount, wallet.id]);
    await client.query('UPDATE cards SET amount_spent_today = $1, updated_at = NOW() WHERE id = $2', [spentToday + spendAmount, cardId]);

    const ref = `SPEND-${uuidv4()}`;
    await client.query(
      `INSERT INTO ledger_entries (transaction_reference, debit_wallet_id, amount, purpose, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [ref, wallet.id, spendAmount, 'CARD_SPEND', JSON.stringify({
        card_id: cardId, mask_pan: card.mask_pan, card_tier: card.card_tier,
        merchant, currency: 'NGN', source: 'user_initiated'
      })]
    );

    await client.query('COMMIT');
    res.json({
      success: true,
      message: `₦${spendAmount.toLocaleString('en-NG')} debited for "${merchant}"`,
      spent_today: spentToday + spendAmount,
      daily_limit: dailyLimit,
      wallet_balance: Number(wallet.balance) - spendAmount,
      reference: ref,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Card spend error:', err);
    res.status(500).json({ error: 'Transaction failed' });
  } finally {
    client.release();
  }
});

// ── Sudo Africa spend webhook ─────────────────────────────────────────────────
// Sudo POSTs card transaction events to this endpoint.
router.post('/webhook/spend', async (req: Request, res: Response) => {
  const rawBody = JSON.stringify(req.body);
  const sig = req.headers['x-sudo-signature'] as string | undefined;

  if (!verifyWebhookSignature(rawBody, sig)) {
    console.warn('[cards-webhook] Invalid Sudo signature — rejected');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const client = await pool.connect();
  try {
    const event = req.body;
    const eventType: string = event?.type || event?.event || '';

    // Only handle authorization/debit events
    if (!['card.transaction', 'CARD_DEBIT', 'transaction.created'].includes(eventType)) {
      return res.status(200).json({ ignored: true, type: eventType });
    }

    const txData = event?.data || event;
    const reference: string = txData?.reference || txData?.transactionReference || '';
    const rawAmount: number = txData?.amount ?? txData?.localAmount ?? 0;
    const amount = Number(rawAmount) / 100; // Sudo sends kobo
    const providerCardId: string = txData?.card?._id || txData?.cardId || txData?.card_id || '';
    const merchant: string = txData?.merchant?.name || txData?.narration || 'Card Purchase';
    const currency: string = txData?.currency || 'NGN';

    if (!reference || !amount || !providerCardId) {
      return res.status(400).json({ error: 'Missing required webhook fields' });
    }

    // Idempotency
    const existingRef = await pool.query(
      'SELECT id FROM ledger_entries WHERE transaction_reference = $1',
      [reference]
    );
    if (existingRef.rows.length > 0) {
      return res.status(200).json({ message: 'Already processed', idempotent: true });
    }

    // Lookup card by providerCardId
    const cardResult = await client.query(
      `SELECT c.*, w.id as wallet_id, w.balance as wallet_balance
       FROM cards c
       JOIN wallets w ON w.user_id = c.user_id AND w.currency = 'NGN'
       WHERE c.provider_card_id = $1 FOR UPDATE`,
      [providerCardId]
    );
    const card = cardResult.rows[0];
    if (!card) {
      console.warn(`[cards-webhook] No card for providerCardId ${providerCardId}`);
      return res.status(404).json({ error: 'Card not found' });
    }

    await client.query('BEGIN');

    // Debit wallet
    await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
      [amount, card.wallet_id]
    );

    // Update card spend tracker (daily)
    await client.query(
      'UPDATE cards SET amount_spent_today = amount_spent_today + $1, updated_at = NOW() WHERE id = $2',
      [amount, card.id]
    );

    // Write ledger entry
    await client.query(
      `INSERT INTO ledger_entries (transaction_reference, debit_wallet_id, amount, purpose, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        reference,
        card.wallet_id,
        amount,
        'CARD_SPEND',
        JSON.stringify({
          card_id: card.id,
          provider_card_id: providerCardId,
          mask_pan: card.mask_pan,
          card_tier: card.card_tier,
          merchant,
          currency,
          source: 'sudo_webhook',
        }),
      ]
    );

    await client.query('COMMIT');
    console.log(`[cards-webhook] ₦${amount} debited from card ${card.mask_pan} at "${merchant}" (ref: ${reference})`);
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[cards-webhook] Error:', err);
    res.status(500).json({ error: 'Processing failed' });
  } finally {
    client.release();
  }
});

// ── Freeze / Unfreeze ─────────────────────────────────────────────────────────
router.patch('/:cardId/status', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  try {
    const { cardId } = req.params;
    const { status } = req.body;
    if (!['ACTIVE', 'FROZEN', 'TERMINATED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    // TERMINATED cards cannot be reactivated
    const existing = await pool.query('SELECT status FROM cards WHERE id = $1 AND user_id = $2', [cardId, req.user!.userId]);
    if (existing.rows[0]?.status === 'TERMINATED') {
      return res.status(400).json({ error: 'Terminated cards cannot be modified' });
    }

    const result = await pool.query(
      'UPDATE cards SET status = $1 WHERE id = $2 AND user_id = $3 RETURNING id, provider_card_id, status',
      [status, cardId, req.user!.userId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Card not found' });

    // Mirror status to Sudo Africa (fire-and-forget, non-blocking)
    const providerCardId = result.rows[0].provider_card_id;
    if (providerCardId && !providerCardId.startsWith('sandbox_')) {
      updateCardStatus(providerCardId, status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE').catch(err =>
        console.error('[cards] Sudo status sync failed:', err)
      );
    }

    res.json({ success: true, card: result.rows[0] });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

// ── Update spending limits ────────────────────────────────────────────────────
router.patch('/:cardId/limits', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
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
      return res.status(400).json({ error: `Limits exceed tier maximum (Daily: ₦${maxDaily.toLocaleString()}, Monthly: ₦${maxMonthly.toLocaleString()})` });
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

// ── Top up a card from wallet balance ─────────────────────────────────────────
router.post('/:cardId/topup', requireAuth, requireUUID, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  try {
    const cardId  = String(req.params.cardId);
    const amount  = Number(req.body.amount);

    if (!amount || amount < 100) {
      client.release();
      return res.status(400).json({ error: 'Minimum top-up is ₦100' });
    }

    // Verify card ownership and state
    const cardResult = await pool.query(
      'SELECT id, provider_card_id, mask_pan, status, sudo_account_id FROM cards WHERE id = $1 AND user_id = $2',
      [cardId, req.user!.userId]
    );
    const card = cardResult.rows[0];
    if (!card)                   { client.release(); return res.status(404).json({ error: 'Card not found' }); }
    if (card.status !== 'ACTIVE') { client.release(); return res.status(400).json({ error: 'Card must be active to top up' }); }

    await client.query('BEGIN');

    // Lock wallet and check balance
    const walletResult = await client.query(
      "SELECT * FROM wallets WHERE user_id = $1 AND currency = 'NGN' FOR UPDATE",
      [req.user!.userId]
    );
    const wallet = walletResult.rows[0];
    if (!wallet) { await client.query('ROLLBACK'); client.release(); return res.status(404).json({ error: 'NGN wallet not found' }); }

    if (Number(wallet.balance) < amount) {
      await client.query('ROLLBACK'); client.release();
      return res.status(400).json({
        error: `Insufficient balance. Available: ₦${Number(wallet.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      });
    }

    // Debit wallet
    await client.query(
      'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
      [amount, wallet.id]
    );

    const ref = `CARD-TOPUP-${uuidv4()}`;

    // Ledger entry
    await client.query(
      `INSERT INTO ledger_entries (id, debit_wallet_id, amount, currency, purpose, transaction_reference, metadata, created_at)
       VALUES (gen_random_uuid(), $1, $2, 'NGN', 'CARD_FUNDING', $3, $4, NOW())`,
      [wallet.id, amount, ref, JSON.stringify({ cardId: card.id, maskPan: card.mask_pan })]
    );

    await client.query('COMMIT');
    client.release();

    // Fund card via Sudo — after commit so wallet is already debited atomically
    // Passes sudo_account_id so the service uses POST /accounts/transfer (correct production path)
    try {
      await fundCard(card.provider_card_id, card.sudo_account_id ?? null, amount);
    } catch (sudoErr: any) {
      console.error('[cards/topup] Sudo fundCard failed after wallet debit:', sudoErr.message);
      return res.status(207).json({
        success: true,
        warning: 'Wallet debited. Card funding is queued — contact support if it does not reflect shortly.',
        reference: ref,
      });
    }

    res.json({
      success: true,
      message: `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })} added to card`,
      reference: ref,
    });
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    console.error('[cards/topup]', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

export default router;
