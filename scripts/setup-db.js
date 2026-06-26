#!/usr/bin/env node
/**
 * NairaVault — Database Setup Script
 * Safe to re-run: creates tables if missing, adds columns if missing.
 * Usage: node scripts/setup-db.js
 * Railway: runs automatically on every deploy (see railway.json).
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost')
    ? false
    : { rejectUnauthorized: false },
});

// ─── Step 1: Create tables (safe if they already exist) ───────────────────────
const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id  BIGINT UNIQUE NOT NULL,
  email        VARCHAR(255),
  kyc_status   VARCHAR(20) DEFAULT 'PENDING',
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency               VARCHAR(10) NOT NULL DEFAULT 'NGN',
  balance                NUMERIC(18,2) NOT NULL DEFAULT 0,
  virtual_account_number VARCHAR(20),
  virtual_bank_name      VARCHAR(100),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS wallets_user_currency_idx ON wallets(user_id, currency);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_reference VARCHAR(255) UNIQUE NOT NULL,
  debit_wallet_id       UUID REFERENCES wallets(id),
  credit_wallet_id      UUID REFERENCES wallets(id),
  amount                NUMERIC(18,2) NOT NULL,
  purpose               VARCHAR(50) NOT NULL,
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_card_id   VARCHAR(255) NOT NULL,
  card_token         VARCHAR(255),
  mask_pan           VARCHAR(20),
  card_tier          VARCHAR(20) DEFAULT 'GOLD',
  card_brand         VARCHAR(20) DEFAULT 'VISA',
  card_currency      VARCHAR(10) DEFAULT 'NGN',
  daily_limit        NUMERIC(18,2) DEFAULT 500,
  monthly_limit      NUMERIC(18,2) DEFAULT 5000,
  amount_spent_today NUMERIC(18,2) DEFAULT 0,
  status             VARCHAR(20) DEFAULT 'ACTIVE',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_kyc (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bvn_hash        VARCHAR(64),
  nin_hash        VARCHAR(64),
  full_name       VARCHAR(255),
  date_of_birth   DATE,
  id_document_url TEXT,
  liveness_score  NUMERIC(5,2),
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT '',
  role          VARCHAR(50)  NOT NULL DEFAULT 'CUSTOMER_SUPPORT',
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
`;

// ─── Step 2: Add missing columns to existing tables ───────────────────────────
// ALTER TABLE ... ADD COLUMN IF NOT EXISTS is idempotent — safe to re-run.
const ADD_MISSING_COLUMNS = [
  // admin_users — columns that may be missing from old deployments
  // Note: no NOT NULL here — existing rows need the default to apply first
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT ''`,
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'CUSTOMER_SUPPORT'`,

  // users — extra columns
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(20) DEFAULT 'PENDING'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,

  // wallets — extra columns
  `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS virtual_account_number VARCHAR(20)`,
  `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS virtual_bank_name VARCHAR(100)`,

  // cards — extra columns
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_token VARCHAR(255)`,
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_tier VARCHAR(20) DEFAULT 'GOLD'`,
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_brand VARCHAR(20) DEFAULT 'VISA'`,
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_currency VARCHAR(10) DEFAULT 'NGN'`,
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS daily_limit NUMERIC(18,2) DEFAULT 500`,
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS monthly_limit NUMERIC(18,2) DEFAULT 5000`,
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS amount_spent_today NUMERIC(18,2) DEFAULT 0`,

  // user_kyc — extra columns
  `ALTER TABLE user_kyc ADD COLUMN IF NOT EXISTS bvn_hash VARCHAR(64)`,
  `ALTER TABLE user_kyc ADD COLUMN IF NOT EXISTS nin_hash VARCHAR(64)`,
  `ALTER TABLE user_kyc ADD COLUMN IF NOT EXISTS id_document_url TEXT`,
  `ALTER TABLE user_kyc ADD COLUMN IF NOT EXISTS liveness_score NUMERIC(5,2)`,
  `ALTER TABLE user_kyc ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ`,
];

async function setup() {
  if (!process.env.DATABASE_URL) {
    console.error('[db:setup] ❌  DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  console.log('[db:setup] Connecting to database…');
  const client = await pool.connect();

  try {
    // Step 1 — create tables
    console.log('[db:setup] Creating tables…');
    await client.query(CREATE_TABLES);
    console.log('[db:setup] Tables ready.');

    // Step 2 — patch any missing columns
    console.log('[db:setup] Patching missing columns…');
    let patchErrors = 0;
    for (const sql of ADD_MISSING_COLUMNS) {
      try {
        await client.query(sql);
        console.log('[db:setup] OK:', sql.slice(0, 80));
      } catch (err) {
        patchErrors++;
        console.error('[db:setup] FAILED:', sql.slice(0, 80));
        console.error('[db:setup] Error:', err.message);
      }
    }
    if (patchErrors > 0) {
      console.error(`[db:setup] ⚠️  ${patchErrors} column patch(es) failed — check logs above.`);
    }
    console.log('[db:setup] ✅  Schema is up to date.');
  } catch (err) {
    console.error('[db:setup] ❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
