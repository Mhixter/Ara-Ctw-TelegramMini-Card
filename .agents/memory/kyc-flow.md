---
name: KYC flow decisions
description: How KYC status transitions work and what env vars control them
---

## Rule
- `KYC_AUTO_APPROVE=false` → submission sets `PENDING_REVIEW`; admin must approve via `/api/admin/kyc/:id/approve`
- `KYC_AUTO_APPROVE` not set (default) → auto-approves to `TIER_1` + provisions virtual account immediately
- Status sequence: PENDING → PENDING_REVIEW → TIER_1 → TIER_2 (or BANNED at any time)
- `kyc_rejection_reason` column on users stores reason shown to user on PENDING after rejection

**Why:** International launch needs human review; Nigerian auto-approve is fine for sandbox dev mode.

**How to apply:** Set `KYC_AUTO_APPROVE=false` in production secrets to require admin review.
