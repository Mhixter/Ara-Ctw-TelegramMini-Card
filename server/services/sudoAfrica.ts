/**
 * sudoAfrica.ts — Sudo Africa card API wrapper.
 *
 * Env vars:
 *   CARD_ISSUER_API_KEY   – Sudo Africa secret key
 *   SUDO_CUSTOMER_ID      – Pre-created Sudo customer / business ID
 *   SUDO_FUND_ACCOUNT_ID  – Sudo funding account ID to debit for card issuance
 *   SUDO_SANDBOX=true     – Force sandbox mode even if API key is present
 *
 * Falls back to sandbox (local mock) when any required var is missing.
 */

const SUDO_BASE = 'https://api.sudo.africa';

function authHeaders() {
  return {
    Authorization: `Bearer ${process.env.CARD_ISSUER_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

function isSandbox() {
  return !process.env.CARD_ISSUER_API_KEY || process.env.SUDO_SANDBOX === 'true';
}

function canIssueRealCard() {
  return (
    !isSandbox() &&
    !!process.env.SUDO_CUSTOMER_ID &&
    !!process.env.SUDO_FUND_ACCOUNT_ID
  );
}

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
  cvv: string | null;
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
  if (!canIssueRealCard()) {
    // Sandbox fallback — generate plausible mock values
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
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    throw new Error(
      `Sudo issueCard failed ${res.status}: ${err?.message || res.statusText}`
    );
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
  const expYear = new Date().getFullYear() + 3;
  if (isSandbox() || providerCardId.startsWith('sandbox_')) {
    return {
      maskPan: providerCardId.startsWith('sandbox_') ? '411111XXXXXX1234' : '411111XXXXXX1234',
      cvv: '***',
      expiry: `12/${String(expYear).slice(-2)}`,
      billingAddress: 'No. 1 Fintech Way, Lagos, Nigeria',
    };
  }

  const res = await fetch(`${SUDO_BASE}/cards/${providerCardId}`, {
    headers: authHeaders(),
  });

  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    throw new Error(
      `Sudo getCardDetails failed ${res.status}: ${err?.message || res.statusText}`
    );
  }

  const data: any = await res.json();
  const card = data?.data;
  return {
    maskPan: card?.maskedPan || `${card?.bin}XXXXXX${card?.last4}`,
    cvv: card?.cvv || null,
    expiry:
      card?.expiry ||
      `${card?.expiryMonth}/${String(card?.expiryYear || expYear).slice(-2)}`,
    billingAddress: card?.billingAddress?.line1,
  };
}

// ─── Freeze / Unfreeze via Sudo API ──────────────────────────────────────────
export async function updateCardStatus(
  providerCardId: string,
  status: 'ACTIVE' | 'INACTIVE'
): Promise<void> {
  if (isSandbox() || providerCardId.startsWith('sandbox_')) return;

  await fetch(`${SUDO_BASE}/cards/${providerCardId}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
}

// ─── HMAC webhook signature verification ─────────────────────────────────────
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | undefined
): boolean {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) return true; // dev / no-key mode — skip

  const crypto = require('crypto');
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return signature === expected || signature === `sha256=${expected}`;
}
