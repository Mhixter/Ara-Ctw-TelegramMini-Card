---
name: Sudo Africa API audit results
description: Confirmed bugs found and fixed vs the Sudo Africa docs; patterns to apply consistently going forward
---

## Card creation body — corrected fields (POST /cards)

- `status` must be **lowercase** `"active"` — NOT `"ACTIVE"`. Same for all status values everywhere.
- `fundingSourceId` (not `debitAccountId`) — links card to a Sudo Funding Source object. Env var: `SUDO_FUNDING_SOURCE_ID`.
- `issuerCountry: "NGA"` — required, was missing.
- `spendingControls` (not `spendingLimits`) is the top-level key; spending limits go inside it as `spendingControls.spendingLimits`.
- `brand` is NOT a create parameter — Sudo determines it from the funding source/issuer config.

**Why:** Our original code used wrong field names and casing that would silently fail in production (Sudo returns 4xx or creates a broken card).

## Card status update (PUT /cards/{id})

- Sudo accepts `active`, `inactive`, `cancelled` (all lowercase).
- Our DB uses `ACTIVE`, `INACTIVE`, `TERMINATED` — must map: TERMINATED → `cancelled`.

## Card funding — no direct fund-card endpoint

- `POST /cards/:id/fund` does NOT exist in production (reference page 404'd).
- `POST /accounts/simulator/fund` is **sandbox-only**.
- Production path: `POST /accounts/transfer` with `{ debitAccountId: SUDO_FUND_ACCOUNT_ID, creditAccountId: <card's account ID>, amount: kobo, narration, currency }`.
- The card's account ID (`data.account`) is returned in the Create Card response. Store it in `cards.sudo_account_id`.

**Why:** Without storing the card's account ID at issue time, top-ups are impossible in production.

## Sensitive card data (PAN/CVV) — vault endpoint required

- Regular `GET /cards/:id` returns **redacted** PAN and CVV (masked).
- Must use **Vault API** for unredacted values:
  - Sandbox: `https://vault.sandbox.sudo.cards/cards/:id?reveal=pan,cvv2`
  - Production: `https://vault.sudo.cards/cards/:id?reveal=pan,cvv2`
- For fully PCI-DSS compliant production flow: use Secure Proxy Show JS library (iframe-based, no PAN through our server).

**Why:** PCI-DSS requirement — sensitive card data must not pass through the business server without proper vault controls.

## Card expiry — stored at issue time

- Sudo returns `expiryMonth` and `expiryYear` (separately) in the Create Card response.
- Stored as formatted `"MM/YY"` string in `cards.expiry` column.
- Used in the VirtualCardVisual component and in the details response.

## DB columns added

- `cards.sudo_account_id VARCHAR(255)` — Sudo account ID for top-up transfers
- `cards.expiry VARCHAR(10)` — formatted "MM/YY" expiry from issue response

## Env vars

| Var | Purpose |
|-----|---------|
| `CARD_ISSUER_API_KEY` | Sudo API key (sandbox mode if missing) |
| `SUDO_CUSTOMER_ID` | Pre-created Sudo business customer ID |
| `SUDO_FUNDING_SOURCE_ID` | Funding source ID for card creation body |
| `SUDO_FUND_ACCOUNT_ID` | Source account for card top-up transfers |

## Outstanding (not fixed here)

- Per-user Sudo customer creation: currently all cards use one shared `SUDO_CUSTOMER_ID`. Correct model is one customer per end-user created at KYC approval time.
- Secure Proxy Show JS library integration for truly PCI-safe View PIN in the browser (current impl uses vault endpoint server-side, which is functional but moves sensitive data through the server).
