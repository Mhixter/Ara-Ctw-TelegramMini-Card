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

// ─── Step 1: Create tables only (no indexes here — indexes go in Step 2) ──────
const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id   BIGINT UNIQUE,
    email         VARCHAR(255),
    password_hash VARCHAR(255),
    google_id     VARCHAR(255),
    github_id     VARCHAR(255),
    first_name    VARCHAR(255),
    kyc_status    VARCHAR(20)  DEFAULT 'PENDING',
    is_active     BOOLEAN      DEFAULT true,
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS wallets (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    currency               VARCHAR(10) NOT NULL DEFAULT 'NGN',
    balance                NUMERIC(18,2) NOT NULL DEFAULT 0,
    virtual_account_number VARCHAR(20),
    virtual_bank_name      VARCHAR(100),
    created_at             TIMESTAMPTZ DEFAULT NOW(),
    updated_at             TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS ledger_entries (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_reference VARCHAR(255) UNIQUE NOT NULL,
    debit_wallet_id       UUID REFERENCES wallets(id),
    credit_wallet_id      UUID REFERENCES wallets(id),
    amount                NUMERIC(18,2) NOT NULL,
    purpose               VARCHAR(50) NOT NULL,
    metadata              JSONB DEFAULT '{}',
    created_at            TIMESTAMPTZ DEFAULT NOW()
  )`,

  `CREATE TABLE IF NOT EXISTS cards (
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
  )`,

  `CREATE TABLE IF NOT EXISTS user_kyc (
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
  )`,

  `CREATE TABLE IF NOT EXISTS admin_users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL DEFAULT '',
    role          VARCHAR(50)  NOT NULL DEFAULT 'CUSTOMER_SUPPORT',
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
  )`,
];

// ─── Step 2: Patch missing columns + indexes (each runs in its own try/catch) ─
const PATCHES = [
  // users — add any columns missing from old deployments
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS email         VARCHAR(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id     VARCHAR(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id     VARCHAR(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name    VARCHAR(255)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status    VARCHAR(20) DEFAULT 'PENDING'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT true`,
  `ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL`,

  // users — indexes (run AFTER column patches so columns exist)
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx     ON users(email)     WHERE email IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_idx ON users(google_id) WHERE google_id IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_github_id_idx ON users(github_id) WHERE github_id IS NOT NULL`,

  // wallets
  `CREATE UNIQUE INDEX IF NOT EXISTS wallets_user_currency_idx ON wallets(user_id, currency)`,
  `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS virtual_account_number VARCHAR(20)`,
  `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS virtual_bank_name VARCHAR(100)`,

  // admin_users
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) DEFAULT ''`,
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role      VARCHAR(50)  DEFAULT 'CUSTOMER_SUPPORT'`,
  `ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`,

  // cards
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_token         VARCHAR(255)`,
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_tier          VARCHAR(20) DEFAULT 'GOLD'`,
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_brand         VARCHAR(20) DEFAULT 'VISA'`,
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS card_currency      VARCHAR(10) DEFAULT 'NGN'`,
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS daily_limit        NUMERIC(18,2) DEFAULT 500`,
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS monthly_limit      NUMERIC(18,2) DEFAULT 5000`,
  `ALTER TABLE cards ADD COLUMN IF NOT EXISTS amount_spent_today NUMERIC(18,2) DEFAULT 0`,

  // user_kyc
  `ALTER TABLE user_kyc ADD COLUMN IF NOT EXISTS bvn_hash        VARCHAR(64)`,
  `ALTER TABLE user_kyc ADD COLUMN IF NOT EXISTS nin_hash        VARCHAR(64)`,
  `ALTER TABLE user_kyc ADD COLUMN IF NOT EXISTS id_document_url TEXT`,
  `ALTER TABLE user_kyc ADD COLUMN IF NOT EXISTS liveness_score  NUMERIC(5,2)`,
  `ALTER TABLE user_kyc ADD COLUMN IF NOT EXISTS verified_at     TIMESTAMPTZ`,
];

async function setup() {
  if (!process.env.DATABASE_URL) {
    console.error('[db:setup] ❌  DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  console.log('[db:setup] Connecting to database…');
  const client = await pool.connect();

  try {
    // Step 1 — create tables individually so one failure doesn't block others
    console.log('[db:setup] Creating tables…');
    for (const sql of CREATE_TABLES) {
      try {
        await client.query(sql);
      } catch (err) {
        console.error('[db:setup] Table create failed:', err.message);
      }
    }

    // Step 2 — patch columns and indexes, each in its own try/catch
    console.log('[db:setup] Patching columns and indexes…');
    let ok = 0, failed = 0;
    for (const sql of PATCHES) {
      try {
        await client.query(sql);
        ok++;
      } catch (err) {
        failed++;
        console.error('[db:setup] PATCH FAILED:', sql.slice(0, 80));
        console.error('[db:setup] Reason:', err.message);
      }
    }

    console.log(`[db:setup] ✅  Done — ${ok} patches applied, ${failed} skipped/failed.`);
  } finally {
    client.release();
    await pool.end();
  }
}

setup().catch(err => {
  console.error('[db:setup] Fatal error:', err.message);
  process.exit(1);
});
