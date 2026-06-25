"use strict";
/**
 * providerBalance.ts
 *
 * Fetches the authoritative balance for a virtual account from the configured
 * card/banking provider. Supported providers (set PROVIDER env var):
 *   - "sudo"   → Sudo Africa  (CARD_ISSUER_API_KEY)
 *   - "mono"   → Mono         (MONO_SECRET_KEY)
 *   - "flutterwave" → Flutterwave (FLW_SECRET_KEY)
 *
 * Returns null if no provider is configured (sandbox/dev mode).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchProviderBalance = fetchProviderBalance;
exports.verifyProviderWebhookSignature = verifyProviderWebhookSignature;
async function fetchProviderBalance(virtualAccountNumber, currency = 'NGN') {
    const provider = (process.env.BALANCE_PROVIDER || '').toLowerCase();
    // ── Sudo Africa ──────────────────────────────────────────────────────────
    if (provider === 'sudo' && process.env.CARD_ISSUER_API_KEY) {
        try {
            const res = await fetch(`https://api.sudo.africa/accounts?number=${virtualAccountNumber}`, {
                headers: {
                    Authorization: `Bearer ${process.env.CARD_ISSUER_API_KEY}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok)
                throw new Error(`Sudo API ${res.status}`);
            const data = await res.json();
            const account = data?.data?.[0];
            return {
                available: Number(account?.availableBalance ?? 0) / 100,
                ledger: Number(account?.ledgerBalance ?? 0) / 100,
                currency,
                provider: 'sudo',
                fetchedAt: new Date().toISOString(),
            };
        }
        catch (err) {
            console.error('[providerBalance] Sudo fetch failed:', err);
            return null;
        }
    }
    // ── Mono ─────────────────────────────────────────────────────────────────
    if (provider === 'mono' && process.env.MONO_SECRET_KEY) {
        try {
            const res = await fetch(`https://api.withmono.com/v2/accounts?account_number=${virtualAccountNumber}`, {
                headers: {
                    'mono-sec-key': process.env.MONO_SECRET_KEY,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok)
                throw new Error(`Mono API ${res.status}`);
            const data = await res.json();
            const account = data?.data?.[0];
            return {
                available: Number(account?.balance ?? 0) / 100,
                ledger: Number(account?.balance ?? 0) / 100,
                currency,
                provider: 'mono',
                fetchedAt: new Date().toISOString(),
            };
        }
        catch (err) {
            console.error('[providerBalance] Mono fetch failed:', err);
            return null;
        }
    }
    // ── Flutterwave ───────────────────────────────────────────────────────────
    if (provider === 'flutterwave' && process.env.FLW_SECRET_KEY) {
        try {
            const res = await fetch(`https://api.flutterwave.com/v3/virtual-account-numbers/${virtualAccountNumber}`, {
                headers: {
                    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok)
                throw new Error(`Flutterwave API ${res.status}`);
            const data = await res.json();
            return {
                available: Number(data?.data?.amount ?? 0),
                ledger: Number(data?.data?.amount ?? 0),
                currency,
                provider: 'flutterwave',
                fetchedAt: new Date().toISOString(),
            };
        }
        catch (err) {
            console.error('[providerBalance] Flutterwave fetch failed:', err);
            return null;
        }
    }
    // No provider configured — sandbox/dev mode
    return null;
}
/**
 * verifyProviderWebhookSignature
 *
 * Returns true if the incoming webhook signature matches the shared secret.
 * Called before processing any funding webhook.
 */
function verifyProviderWebhookSignature(rawBody, signature) {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret)
        return true; // dev mode — skip verification
    const crypto = require('crypto');
    const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
    return signature === expected || signature === `sha256=${expected}`;
}
