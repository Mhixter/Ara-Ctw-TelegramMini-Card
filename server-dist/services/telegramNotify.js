"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTelegramMessage = sendTelegramMessage;
exports.buildCreditMessage = buildCreditMessage;
exports.buildKycApprovalMessage = buildKycApprovalMessage;
exports.buildKycRejectionMessage = buildKycRejectionMessage;
const https_1 = __importDefault(require("https"));
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
function post(path, body) {
    return new Promise((resolve) => {
        const data = JSON.stringify(body);
        const req = https_1.default.request({
            hostname: 'api.telegram.org',
            path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
        }, (res) => {
            res.on('data', () => { });
            res.on('end', resolve);
        });
        req.on('error', (err) => {
            console.warn('[telegramNotify] HTTP error:', err.message);
            resolve();
        });
        req.write(data);
        req.end();
    });
}
async function sendTelegramMessage(telegramId, message, parseMode = 'HTML') {
    if (!BOT_TOKEN) {
        console.warn('[telegramNotify] TELEGRAM_BOT_TOKEN not set — skipping notification');
        return;
    }
    if (!telegramId) {
        return;
    }
    try {
        await post(`/bot${BOT_TOKEN}/sendMessage`, {
            chat_id: String(telegramId),
            text: message,
            parse_mode: parseMode,
        });
        console.log(`[telegramNotify] Sent to ${telegramId}`);
    }
    catch (err) {
        console.warn('[telegramNotify] Failed to send:', err.message);
    }
}
function buildCreditMessage(opts) {
    const { amount, currency, newBalance, reference, source, accountNumber, bankName } = opts;
    const sym = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency;
    const fmt = (n) => n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return [
        `✅ <b>Wallet Credited</b>`,
        ``,
        `💰 <b>Amount:</b> ${sym}${fmt(amount)}`,
        `📊 <b>New Balance:</b> ${sym}${fmt(newBalance)}`,
        accountNumber ? `🏦 <b>Account:</b> ${accountNumber}${bankName ? ` · ${bankName}` : ''}` : null,
        `🔑 <b>Reference:</b> <code>${reference}</code>`,
        `📡 <b>Source:</b> ${source}`,
        ``,
        `<i>BoorderPay — your wallet is ready to use.</i>`,
    ]
        .filter((l) => l !== null)
        .join('\n');
}
function buildKycApprovalMessage(tier) {
    const tierName = tier === 'TIER_2' ? '🏆 Platinum (Tier 2)' : '🥇 Gold (Tier 1)';
    const limit = tier === 'TIER_2' ? '$5,000/day' : '$500/day';
    return [
        `🎉 <b>KYC Approved!</b>`,
        ``,
        `Your identity has been verified. You are now <b>${tierName}</b>.`,
        ``,
        `💳 <b>Spend limit:</b> ${limit}`,
        `✅ Virtual card issuance unlocked`,
        `✅ Wallet funding enabled`,
        ``,
        `<i>BoorderPay — cross-border payments, simplified.</i>`,
    ].join('\n');
}
function buildKycRejectionMessage(reason) {
    return [
        `❌ <b>KYC Verification Failed</b>`,
        ``,
        `Your identity submission could not be approved.`,
        ``,
        `<b>Reason:</b> ${reason || 'Please resubmit with a clearer document.'}`,
        ``,
        `👉 Open BoorderPay and tap <b>Verify</b> to resubmit.`,
    ].join('\n');
}
