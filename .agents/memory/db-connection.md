---
name: Database connection pattern
description: Why server/db.ts prefers PG_* vars over DATABASE_URL, and when this matters
---

**Rule:** `server/db.ts` checks `PGHOST` + `PGDATABASE` first and builds a Pool from individual PG vars. Only falls back to `DATABASE_URL` if those are absent.

**Why:** The user set DATABASE_URL as a Replit Secret with garbage data, which shadowed Replit's runtime-managed DATABASE_URL. The individual PG vars (PGHOST, PGDATABASE, PGPORT, PGUSER, PGPASSWORD) are injected at the OS level and cannot be overridden by user secrets. This pattern makes the connection resilient to a common secret-entry mistake.

**How to apply:** Never change this priority order. If the user reports DB connection failures, check whether DATABASE_URL secret contains valid data. The PGHOST on Replit is typically `helium` (172.24.0.3).
