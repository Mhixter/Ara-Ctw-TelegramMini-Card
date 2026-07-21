"use strict";
/**
 * sudoAfrica.ts — Sudo Africa card API wrapper.
 *
 * Env vars:
 *   CARD_ISSUER_API_KEY      – Sudo Africa secret key
 *   SUDO_CUSTOMER_ID         – Pre-created Sudo customer / business ID
 *   SUDO_FUNDING_SOURCE_ID   – Sudo funding source ID (linked to your settlement account)
 *   SUDO_FUND_ACCOUNT_ID     – Sudo account ID used as debit source for card top-ups
 *   SUDO_SANDBOX=true        – Force sandbox mode even if API key is present
 *
 * Falls back to sandbox (local mock) when any required var is missing.
 *
 * ── API base URLs ─────────────────────────────────────────────────────────────
 * Cards API:   https://api.sudo.africa          (live)
 *              https://api.sandbox.sudo.cards    (sandbox)
 * Vault API:   https://vault.sudo.cards         (live — PCI-compliant card reveal)
 *              https://vault.sandbox.sudo.cards  (sandbox)
 *
 * Sensitive card data (PAN, CVV2) is REDACTED from the regular cards endpoint.
 * It must be fetched from the Vault endpoint. This is a PCI-DSS requirement.
 * ─────────────────────────────────────────────────────────────────────────────
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSudoCustomer = createSudoCustomer;
exports.issueCard = issueCard;
exports.getCardDetails = getCardDetails;
exports.updateCardStatus = updateCardStatus;
exports.fundCard = fundCard;
exports.assertSudoProductionReady = assertSudoProductionReady;
exports.getSudoFundAccountBalance = getSudoFundAccountBalance;
exports.verifyWebhookSignature = verifyWebhookSignature;
function isSandbox() {
    return !process.env.CARD_ISSUER_API_KEY || process.env.SUDO_SANDBOX === 'true';
}
function sudoBase() {
    return isSandbox()
        ? 'https://api.sandbox.sudo.cards'
        : 'https://api.sudo.africa';
}
function vaultBase() {
    return isSandbox()
        ? 'https://vault.sandbox.sudo.cards'
        : 'https://vault.sudo.cards';
}
function authHeaders() {
    return {
        Authorization: `Bearer ${process.env.CARD_ISSUER_API_KEY}`,
        'Content-Type': 'application/json',
    };
}
function canIssueRealCard() {
    return (!isSandbox() &&
        !!process.env.SUDO_FUNDING_SOURCE_ID);
}
// ─── Create a Sudo customer for a BorderPay user ─────────────────────────────
// Called once per user before their first card is issued.
// Returns the Sudo customer _id to store on users.sudo_customer_id.
async function createSudoCustomer(opts) {
    const res = await fetch(`${sudoBase()}/customers`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            type: 'individual',
            name: `${opts.firstName} ${opts.lastName}`.trim(),
            emailAddress: opts.email || undefined,
            phoneNumber: opts.phoneNumber || undefined,
            individual: {
                firstName: opts.firstName,
                lastName: opts.lastName,
            },
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Sudo createCustomer failed ${res.status}: ${err?.message || res.statusText}`);
    }
    const data = await res.json();
    const customerId = data?.data?._id;
    if (!customerId)
        throw new Error('Sudo createCustomer: no _id in response');
    return customerId;
}
// ─── Issue a card ─────────────────────────────────────────────────────────────
async function issueCard(opts) {
    if (!canIssueRealCard()) {
        // Sandbox fallback — generate plausible mock values
        const { v4: uuidv4 } = await Promise.resolve().then(() => __importStar(require('uuid')));
        const pan = `4111${Math.random().toString().slice(2, 8).padStart(6, '0')}${Math.floor(1000 + Math.random() * 9000)}`;
        const expYear = String(new Date().getFullYear() + 3).slice(-2);
        return {
            providerCardId: `sandbox_${uuidv4()}`,
            cardToken: `tok_${uuidv4().replace(/-/g, '')}`,
            maskPan: `${pan.slice(0, 6)}XXXXXX${pan.slice(-4)}`,
            status: 'ACTIVE',
            brand: opts.brand,
            currency: opts.currency,
            type: 'VIRTUAL',
            accountId: null,
            expiry: `12/${expYear}`,
        };
    }
    // Docs: POST /cards
    // status, type, currency, issuerCountry are all lowercase in Sudo's API.
    // fundingSourceId links the card to a Sudo funding source (not the account).
    // spendingControls.channels enables card usage on web/pos/atm/mobile.
    const body = {
        customerId: opts.sudoCustomerId,
        type: 'virtual',
        currency: opts.currency,
        status: 'active', // MUST be lowercase
        issuerCountry: 'NGA',
        fundingSourceId: process.env.SUDO_FUNDING_SOURCE_ID,
        metadata: JSON.stringify({ internalUserId: opts.userId, tier: opts.tier }),
        spendingControls: {
            allowedCategories: [],
            blockedCategories: [],
            channels: { atm: false, pos: true, web: true, mobile: true },
            spendingLimits: [
                { amount: opts.dailyLimit * 100, interval: 'daily' },
                { amount: opts.monthlyLimit * 100, interval: 'monthly' },
            ],
        },
    };
    const res = await fetch(`${sudoBase()}/cards`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Sudo issueCard failed ${res.status}: ${err?.message || res.statusText}`);
    }
    const data = await res.json();
    const card = data?.data;
    const expiryMonth = String(card?.expiryMonth || '12').padStart(2, '0');
    const expiryYear = String(card?.expiryYear || new Date().getFullYear() + 3).slice(-2);
    return {
        providerCardId: card?._id || card?.id,
        cardToken: card?.token || card?._id,
        maskPan: card?.maskedPan || `${card?.bin}XXXXXX${card?.last4}`,
        status: (card?.status || 'active').toUpperCase(),
        brand: (card?.brand || opts.brand).toUpperCase(),
        currency: card?.currency || opts.currency,
        type: card?.type || 'VIRTUAL',
        accountId: card?.account?._id || card?.account || null,
        expiry: `${expiryMonth}/${expiryYear}`,
    };
}
// ─── Fetch card details from Vault (PAN + CVV2) ───────────────────────────────
// Sudo redacts sensitive fields from the regular /cards/:id endpoint.
// PCI-DSS compliant retrieval requires the Vault endpoint.
// In production, prefer the Secure Proxy Show JS library (client-side iframe)
// to avoid PAN passing through your servers at all.
async function getCardDetails(providerCardId) {
    const expYear = new Date().getFullYear() + 3;
    if (isSandbox() || providerCardId.startsWith('sandbox_')) {
        return {
            maskPan: '411111XXXXXX1234',
            pan: null, // not returned in sandbox
            cvv: '***',
            expiry: `12/${String(expYear).slice(-2)}`,
            billingAddress: 'No. 1 Fintech Way, Lagos, Nigeria',
        };
    }
    // Vault endpoint returns unredacted PAN and CVV2.
    // The ?reveal=pan,cvv2 param is required to get sensitive fields.
    const res = await fetch(`${vaultBase()}/cards/${providerCardId}?reveal=pan,cvv2`, { headers: authHeaders() });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Sudo Vault getCardDetails failed ${res.status}: ${err?.message || res.statusText}`);
    }
    const data = await res.json();
    const card = data?.data;
    const month = String(card?.expiryMonth || '12').padStart(2, '0');
    const year = String(card?.expiryYear || expYear).slice(-2);
    return {
        maskPan: card?.maskedPan || `${card?.bin}XXXXXX${card?.last4}`,
        pan: card?.pan || null,
        cvv: card?.cvv2 || card?.cvv || null,
        expiry: card?.expiry || `${month}/${year}`,
        billingAddress: card?.billingAddress?.line1,
    };
}
// ─── Freeze / Unfreeze via Sudo API ──────────────────────────────────────────
// Docs: PUT /cards/{id}
// Status values in Sudo's API are lowercase: active, inactive, cancelled
async function updateCardStatus(providerCardId, status) {
    if (isSandbox() || providerCardId.startsWith('sandbox_'))
        return;
    // Map our uppercase statuses to Sudo's lowercase ones
    const sudoStatus = status === 'ACTIVE' ? 'active' :
        status === 'TERMINATED' ? 'cancelled' : 'inactive';
    await fetch(`${sudoBase()}/cards/${providerCardId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: sudoStatus }),
    });
}
// ─── Fund / top-up a specific card via account transfer ──────────────────────
// There is no direct POST /cards/:id/fund endpoint in production.
// Funding is done via POST /accounts/transfer from the fund account
// to the card's linked account (stored in cards.sudo_account_id).
// SUDO_FUND_ACCOUNT_ID is the source (your settlement/float account).
async function fundCard(providerCardId, cardAccountId, amountNaira) {
    if (isSandbox() || providerCardId.startsWith('sandbox_'))
        return;
    if (!cardAccountId) {
        throw new Error('Card account ID not available — card was issued without an account link. Re-issue or update manually.');
    }
    if (!process.env.SUDO_FUND_ACCOUNT_ID) {
        throw new Error('SUDO_FUND_ACCOUNT_ID env var is not set.');
    }
    const res = await fetch(`${sudoBase()}/accounts/transfer`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
            debitAccountId: process.env.SUDO_FUND_ACCOUNT_ID,
            creditAccountId: cardAccountId,
            amount: Math.round(amountNaira * 100), // kobo
            narration: 'BorderPay card top-up',
            currency: 'NGN',
        }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Sudo fundCard transfer failed ${res.status}: ${err?.message || res.statusText}`);
    }
}
// ─── Production-mode guard ────────────────────────────────────────────────────
function assertSudoProductionReady() {
    if (process.env.NODE_ENV === 'production' && !canIssueRealCard()) {
        const missing = [
            !process.env.CARD_ISSUER_API_KEY && 'CARD_ISSUER_API_KEY',
            !process.env.SUDO_FUNDING_SOURCE_ID && 'SUDO_FUNDING_SOURCE_ID',
        ].filter(Boolean).join(', ');
        const err = new Error(`Card service not configured for production. Missing: ${missing}`);
        err.statusCode = 503;
        throw err;
    }
}
// ─── Fund-account balance ─────────────────────────────────────────────────────
// Fetches the balance of our settlement/float account (SUDO_FUND_ACCOUNT_ID).
async function getSudoFundAccountBalance() {
    if (isSandbox() || !process.env.SUDO_FUND_ACCOUNT_ID)
        return null;
    try {
        const res = await fetch(`${sudoBase()}/accounts/${process.env.SUDO_FUND_ACCOUNT_ID}`, { headers: authHeaders() });
        if (!res.ok)
            throw new Error(`Sudo API ${res.status}`);
        const data = await res.json();
        const account = data?.data;
        return {
            available: Number(account?.availableBalance ?? 0) / 100,
            ledger: Number(account?.ledgerBalance ?? 0) / 100,
        };
    }
    catch (err) {
        console.error('[sudo] Fund account balance fetch failed:', err);
        return null;
    }
}
// ─── HMAC webhook signature verification ─────────────────────────────────────
function verifyWebhookSignature(rawBody, signature) {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret)
        return true; // dev / no-key mode — skip
    const crypto = require('crypto');
    const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
    return signature === expected || signature === `sha256=${expected}`;
}
