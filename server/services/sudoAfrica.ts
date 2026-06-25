/**
 * sudoAfrica.ts
 *
 * Thin wrapper around the Sudo Africa card API.
 * All calls are no-ops (returning sandbox data) when CARD_ISSUER_API_KEY is not set.
 *
 * Env vars:
 *   CARD_ISSUER_API_KEY   – Sudo Africa secret key
 *   SUDO_CUSTOMER_ID      – Pre-created Sudo customer / business ID
 *   SUDO_FUND_ACCOUNT_ID  – Sudo funding account ID to debit for card issuance
 */

const SUDO_BASE = 'https://api.sudo.africa';

function headers() {
  return {
    Authorization: `Bearer ${process.env.CARD_ISSUER_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

function isSandbox() {
  return !process.env.CARD_ISSUER_API_KEY;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SudoCard {
  providerCardId: string;
  cardToken: string;
  maskPan: string;
  status: string;
  brand: string;
  currency: string;
  type: string;
}

export interface SudoCardDetails {
  maskPan: string;
  cvv: string | null;    // returned once by Sudo, never stored
  expiry: string;
  billingAddress?: string;
}

// ─── Issue a card ─────────────────────────────────────────────────────────────

export async function issueCard(opts: {
  brand: 'VISA' | 'MASTERCARD';
  currency: string;
  tier: 'GOLD' | 'PLATINUM';
  dailyLimit: number;
  monthlyLimit: number;
  userId: string;
}): Promise<SudoCard> {
  if (isSandbox()) {
    // Local sandbox — generate plausible mock values
    const { v4: uuidv4 } = await import('uuid');
    const pan = `4111${Math.random().toString().slice(2, 8).padStart(6, '0')}${Math.floor(1000 + Math.random() * 9000)}`;
    return {
      providerCardId: `sandbox_${uuidv4()}`,
      cardToken: `tok_${uuidv4().replace(/-/g, '')}`,
      maskPan: `${pan.slice(0, 6)}XXXXXX${pan.slice(-4)}`,
      status: 'ACTIVE',
      brand: opts.brand,
      currency: opts.currency,
      type: 'VIRTUAL',
    };
  }

  const body = {
    type: 'VIRTUAL',
    brand: opts.brand,
    currency: opts.currency,
    status: 'ACTIVE',
    debitAccountId: process.env.SUDO_FUND_ACCOUNT_ID,
    spendingLimits: [
      { amount: opts.dailyLimit * 100, interval: 'DAILY' },
      { amount: opts.monthlyLimit * 100, interval: 'MONTHLY' },
    ],
    customerId: process.env.SUDO_CUSTOMER_ID,
    metadata: { internalUserId: opts.userId, tier: opts.tier },
  };

  const res = await fetch(`${SUDO_BASE}/cards`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    throw new Error(`Sudo issueCard failed ${res.status}: ${err?.message || res.statusText}`);
  }

  const data: any = await res.json();
  const card = data?.data;
  return {
    providerCardId: card?._id || card?.id,
    cardToken: card?.token || card?._id,
    maskPan: card?.maskedPan || `${card?.bin}XXXXXX${card?.last4}`,
    status: card?.status,
    brand: card?.brand,
    currency: card?.currency,
    type: card?.type,
  };
}

// ─── Fetch card details (PAN + one-time CVV) ─────────────────────────────────

export async function getCardDetails(providerCardId: string): Promise<SudoCardDetails> {
  if (isSandbox() || !providerCardId.startsWith('sandbox_') === false) {
    // sandbox — return mock details
    const expYear = new Date().getFullYear() + 3;
    return {
      maskPan: '411111XXXXXX1234',
      cvv: '***',
      expiry: `12/${String(expYear).slice(-2)}`,
      billingAddress: 'No. 1 Fintech Way, Lagos, Nigeria',
    };
  }

  const res = await fetch(`${SUDO_BASE}/cards/${providerCardId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    throw new Error(`Sudo getCardDetails failed ${res.status}: ${err?.message || res.statusText}`);
  }

  const data: any = await res.json();
  const card = data?.data;
  return {
    maskPan: card?.maskedPan || `${card?.bin}XXXXXX${card?.last4}`,
    cvv: card?.cvv || null,
    expiry: card?.expiry || `${card?.expiryMonth}/${card?.expiryYear?.slice(-2)}`,
    billingAddress: card?.billingAddress?.line1,
  };
}

// ─── Freeze / unfreeze via Sudo API ─────────────────────────────────────────

export async function updateCardStatus(providerCardId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<void> {
  if (isSandbox()) return;

  await fetch(`${SUDO_BASE}/cards/${providerCardId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ status }),
  });
}

// ─── HMAC signature verification ─────────────────────────────────────────────

export function verifyWebhookSignature(rawBody: string, signature: string | undefined): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // dev / sandbox — skip

  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return signature === expected || signature === `sha256=${expected}`;
}
