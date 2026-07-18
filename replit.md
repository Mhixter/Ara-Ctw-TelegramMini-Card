# BorderPay — Cross-Border Payments Telegram Mini App

## Project Overview

BorderPay is a production-ready fintech Telegram Mini App for cross-border NGN payments. Users sign in via Telegram, hold an NGN wallet backed by a virtual bank account (PayPoint), issue virtual Visa/Mastercard cards (Sudo Africa), and send money instantly to other BorderPay users by Telegram username.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 + TypeScript + TanStack Query |
| Backend | Express 5 + TypeScript + ts-node |
| Database | PostgreSQL (Replit-managed; uses PGHOST/PGDATABASE env vars) |
| Auth | Telegram HMAC-SHA256 (initData + Widget modes) |
| Cards | Sudo Africa production API |
| Virtual accounts | PayPoint production API |
| Notifications | Telegram Bot API |
| Styling | Glassmorphism, Manrope font, purple #6C5CE7 / gold #F4B400 / emerald #22C55E |

## How to Run

```
npm run dev
```
- Frontend: http://localhost:5000 (Vite)
- Backend:  http://localhost:3001 (Express)

The backend auto-migrates the database schema on every startup.

## Key Architecture Decisions

### Database Connection
`server/db.ts` prefers individual PG environment variables (`PGHOST`, `PGDATABASE`, `PGPORT`, `PGUSER`, `PGPASSWORD`) over `DATABASE_URL`. This bypasses any user-provided DATABASE_URL secret that might contain invalid data, while using Replit's injected runtime vars directly. Falls back to DATABASE_URL for external deployments (Railway, Supabase).

### Double-Entry Ledger
All financial movements go through `ledger_entries`. Wallet balances are always recomputed from the ledger on every read and corrected if they drift. No financial operation updates only the `wallets.balance` column directly.

### Telegram-Only P2P Transfers
`POST /api/wallet/send` — Telegram-to-Telegram transfers only. No external bank withdrawals. Recipients are found by Telegram username stored in the `users.username` column. Both parties receive Telegram notifications.

### Production Services
- **Sudo Africa**: Enabled when `CARD_ISSUER_API_KEY` + `SUDO_CUSTOMER_ID` + `SUDO_FUND_ACCOUNT_ID` are set; falls back to sandbox mock otherwise.
- **PayPoint**: Enabled when `PAYPOINT_API_KEY` is set; falls back to mock.
- **Telegram Bot**: Enabled (production auth mode) when `TELEGRAM_BOT_TOKEN` is set.

### Webhook Security
All inbound funding webhooks (`POST /api/wallet/webhook/funding`) verify HMAC-SHA256 signatures using `WEBHOOK_SECRET`. The webhook handler normalises payloads from Sudo Africa, PayPoint, Mono, and Flutterwave.

## Environment Variables

### Required Secrets (set via Replit Secrets)
| Key | Purpose |
|-----|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot auth + notifications |
| `CARD_ISSUER_API_KEY` | Sudo Africa production key |
| `SUDO_CUSTOMER_ID` | Sudo Africa business customer ID |
| `SUDO_FUND_ACCOUNT_ID` | Sudo Africa funding account for card issuance |
| `PAYPOINT_API_KEY` | PayPoint virtual account production key |
| `WEBHOOK_SECRET` | HMAC secret for verifying inbound webhooks |

### Optional Secrets
| Key | Purpose |
|-----|---------|
| `PAYPOINT_WEBHOOK_SECRET` | Separate HMAC for PayPoint webhooks (falls back to WEBHOOK_SECRET) |
| `PAYPOINT_BASE_URL` | Override PayPoint API base URL |

### Non-Secret Env Vars (shared)
| Key | Default | Purpose |
|-----|---------|---------|
| `NODE_ENV` | `development` | Controls logging and error verbosity |
| `PORT` | `3001` | Express server port |
| `ALLOWED_ORIGINS` | `true` | CORS allowed origins |
| `BALANCE_PROVIDER` | `sudo` | Which provider to sync balance from (`sudo`/`mono`/`flutterwave`) |
| `SUDO_SANDBOX` | `false` | Force Sudo Africa sandbox mode |

## Railway / Cloudflare Deployment Notes

### Railway
1. Push code to GitHub (connected to Railway)
2. Railway runs `npm run build` then `node server-dist/index.js`
3. Set all required secrets in Railway's environment settings
4. Set `DATABASE_URL` to Railway's PostgreSQL connection string
5. Set `ALLOWED_ORIGINS` to your Railway domain

### Cloudflare Workers
- `wrangler.jsonc` and `worker.js` handle the CF Worker deployment
- Run `npm run deploy:cf` after building
- CF Workers serve the static frontend; the Express API needs separate hosting

## Database Schema (auto-migrated on startup)
- `users` — Telegram users (id, telegram_id, username, first_name, kyc_status)
- `wallets` — NGN wallets with virtual account details
- `ledger_entries` — Double-entry ledger for all financial movements
- `cards` — Virtual cards issued via Sudo Africa
- `user_kyc` — KYC verification data (Tier 1 + Tier 2)
- `admin_users` — Admin panel users

## User Preferences
- Keep Telegram-only transfer model (no external bank withdrawals from UI)
- Sudo Africa and PayPoint are live production integrations
- Premium ARA-style design: purple #6C5CE7, gold #F4B400, emerald #22C55E, 24px radius, Manrope font
