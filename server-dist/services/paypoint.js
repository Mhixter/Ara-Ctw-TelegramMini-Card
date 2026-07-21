"use strict";
/**
 * paypoint.ts — PayPoint virtual account service wrapper.
 *
 * Env vars:
 *   PAYPOINT_API_KEY      — PayPoint secret/API key
 *   PAYPOINT_BASE_URL     — Base URL (defaults to https://api.paypoint.africa/v1)
 *   PAYPOINT_SANDBOX=true — Force sandbox mode
 *
 * Falls back to sandbox (mock) when credentials are missing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVirtualAccount = createVirtualAccount;
exports.getVirtualAccountBalance = getVirtualAccountBalance;
exports.verifyPayPointWebhook = verifyPayPointWebhook;
exports.assertPayPointProductionReady = assertPayPointProductionReady;
exports.initiateTransferToSudo = initiateTransferToSudo;
exports.parsePayPointWebhook = parsePayPointWebhook;
const BASE_URL = process.env.PAYPOINT_BASE_URL || 'https://api.paypoint.africa/v1';
function authHeaders() {
    return {
        Authorization: `Bearer ${process.env.PAYPOINT_API_KEY}`,
        'Content-Type': 'application/json',
    };
}
function isSandbox() {
    return !process.env.PAYPOINT_API_KEY || process.env.PAYPOINT_SANDBOX === 'true';
}
/**
 * Create a dedicated virtual account for a user.
 * In sandbox mode returns a mock Paypoint-style account.
 */
async function createVirtualAccount(opts) {
    if (isSandbox()) {
        // Generate a plausible-looking mock account
        const suffix = Math.floor(1000000 + Math.random() * 9000000);
        return {
            accountNumber: `5${suffix}`,
            accountName: opts.fullName,
            bankName: 'PayPoint MFB',
            bankCode: '120001',
            reference: `PP-${opts.userId.slice(0, 8).toUpperCase()}`,
        };
    }
    const body = {
        customer: {
            name: opts.fullName,
            email: opts.email || `user_${opts.userId}@boorderpay.app`,
            bvn: opts.bvn,
        },
        currency: opts.currency || 'NGN',
        reference: `BP-${opts.userId}`,
        meta: { internalUserId: opts.userId },
    };
    const res = await fetch(`${BASE_URL}/virtual-accounts`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`PayPoint createVirtualAccount failed ${res.status}: ${err?.message || res.statusText}`);
    }
    const data = await res.json();
    const account = data?.data || data;
    return {
        accountNumber: account.account_number || account.accountNumber,
        accountName: account.account_name || account.accountName || opts.fullName,
        bankName: account.bank_name || account.bankName || 'PayPoint MFB',
        bankCode: account.bank_code || account.bankCode,
        reference: account.reference || `BP-${opts.userId}`,
    };
}
/**
 * Fetch the current balance for a PayPoint virtual account.
 */
async function getVirtualAccountBalance(accountNumber) {
    if (isSandbox())
        return null;
    try {
        const res = await fetch(`${BASE_URL}/virtual-accounts/${accountNumber}/balance`, { headers: authHeaders() });
        if (!res.ok)
            throw new Error(`PayPoint balance ${res.status}`);
        const data = await res.json();
        const d = data?.data || data;
        return {
            available: Number(d.available_balance ?? d.balance ?? 0) / 100,
            ledger: Number(d.ledger_balance ?? d.balance ?? 0) / 100,
        };
    }
    catch (err) {
        console.error('[paypoint] Balance fetch failed:', err);
        return null;
    }
}
/**
 * Verify an inbound PayPoint webhook signature.
 * Uses HMAC-SHA256 of the raw body against PAYPOINT_WEBHOOK_SECRET.
 */
function verifyPayPointWebhook(rawBody, signature) {
    const secret = process.env.PAYPOINT_WEBHOOK_SECRET;
    if (!secret)
        return true; // dev/no-key — skip
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    return signature === expected || signature === `sha256=${expected}`;
}
// ─── Production-mode guard ────────────────────────────────────────────────────
function assertPayPointProductionReady() {
    if (process.env.NODE_ENV === 'production' && isSandbox()) {
        const err = new Error('Virtual account service not configured for production. Missing: PAYPOINT_API_KEY');
        err.statusCode = 503;
        throw err;
    }
}
async function initiateTransferToSudo(opts) {
    if (isSandbox()) {
        console.log(`[paypoint] SANDBOX sweep simulated: ₦${opts.amountNaira} ref=${opts.reference}`);
        return { reference: opts.reference, status: 'MOCK_PENDING', amount: opts.amountNaira };
    }
    const accountNumber = process.env.SUDO_COLLECTION_ACCOUNT_NUMBER;
    const bankCode = process.env.SUDO_COLLECTION_BANK_CODE;
    if (!accountNumber || !bankCode) {
        throw new Error('Sweep not configured. Set SUDO_COLLECTION_ACCOUNT_NUMBER and SUDO_COLLECTION_BANK_CODE.');
    }
    const body = {
        amount: Math.round(opts.amountNaira * 100), // kobo
        destination: { account_number: accountNumber, bank_code: bankCode },
        reference: opts.reference,
        narration: opts.narration || 'BorderPay → Sudo fund sweep',
    };
    const res = await fetch(`${BASE_URL}/transfers`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`PayPoint transfer failed ${res.status}: ${err?.message || res.statusText}`);
    }
    const data = await res.json();
    return {
        reference: data?.data?.reference || opts.reference,
        status: data?.data?.status || 'PENDING',
        amount: opts.amountNaira,
    };
}
function parsePayPointWebhook(body) {
    try {
        const data = body?.data || body;
        const rawAmount = data?.amount ?? data?.settled_amount ?? 0;
        // PayPoint sends amounts in kobo
        const amount = Number(rawAmount) / 100;
        const reference = data?.reference ||
            data?.transaction_reference ||
            data?.narration;
        const accountNumber = data?.account_number ||
            data?.accountNumber ||
            data?.destination_account;
        if (!reference || !amount || !accountNumber)
            return null;
        return {
            reference: String(reference),
            amount,
            accountNumber: String(accountNumber),
            currency: data?.currency || 'NGN',
            senderName: data?.sender_name || data?.senderName,
        };
    }
    catch {
        return null;
    }
}
