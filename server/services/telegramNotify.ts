import https from 'https';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

export interface NotifyPayload {
  telegramId: string | number;
  message: string;
  parseMode?: 'HTML' | 'Markdown';
}

function post(path: string, body: object): Promise<void> {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      }
    );
    req.on('error', (err) => {
      console.warn('[telegramNotify] HTTP error:', err.message);
      resolve();
    });
    req.write(data);
    req.end();
  });
}

export async function sendTelegramMessage(
  telegramId: string | number,
  message: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<void> {
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
  } catch (err: any) {
    console.warn('[telegramNotify] Failed to send:', err.message);
  }
}

export function buildCreditMessage(opts: {
  amount: number;
  currency: string;
  newBalance: number;
  reference: string;
  source: string;
  accountNumber?: string;
  bankName?: string;
}): string {
  const { amount, currency, newBalance, reference, source, accountNumber, bankName } = opts;
  const sym = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency;
  const fmt = (n: number) =>
    n.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

export function buildKycApprovalMessage(tier: string): string {
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

export function buildKycRejectionMessage(reason: string): string {
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
