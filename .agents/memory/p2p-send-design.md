---
name: P2P send design (Telegram-only transfers)
description: How the Telegram-to-Telegram send feature works and why external withdrawal was removed
---

**Rule:** All user-to-user transfers go through `POST /api/wallet/send`. No external bank withdrawal UI exists — transfers are Telegram-to-Telegram only.

**Why:** User's explicit requirement: "remove sending or withdrawal outside telegram, just send to telegram user using username."

**How to apply:**
- Recipient lookup: `GET /api/wallet/users/search?q=<username>` — searches `users.username` column (lowercase match).
- Transfer: double-entry ledger entry with purpose `P2P_SEND`; both sender and recipient wallet balances updated atomically within a transaction.
- Both parties get Telegram Bot notifications after commit.
- `users.username` is now stored on every Telegram auth upsert (server/routes/auth.ts).
- KYC is required for sender (PENDING users blocked); recipient can be unverified.
