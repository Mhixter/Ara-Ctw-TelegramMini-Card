#!/usr/bin/env node
/**
 * NairaVault — Database Setup Script
 * Run once to create all required tables.
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

const schema = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id  BIGINT UNIQUE NOT NULL,
  email        VARCHAR(255),
  kyc_status   VARCHAR(20) DEFAULT 'PENDING'
               CHECK (kyc_status IN ('PENDING','TIER_1','TIER_2','BANNED')),
  is_active    BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency               VARCHAR(10) NOT NULL DEFAULT 'NGN',
  balance                NUMERIC(18,2) NOT NULL DEFAULT 0,
  virtual_account_number VARCHAR(20),
  virtual_bank_name      VARCHAR(100),
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

-- Ledger (double-entry)
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

-- Virtual cards
CREATE TABLE IF NOT EXISTS cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_card_id VARCHAR(255) NOT NULL,
  card_token       VARCHAR(255),
  mask_pan         VARCHAR(20),
  card_tier        VARCHAR(20) DEFAULT 'GOLD'
                   CHECK (card_tier IN ('GOLD','PLATINUM')),
  card_brand       VARCHAR(20) DEFAULT 'VISA',
  card_currency    VARCHAR(10) DEFAULT 'NGN',
  daily_limit      NUMERIC(18,2) DEFAULT 500,
  monthly_limit    NUMERIC(18,2) DEFAULT 5000,
  amount_spent_today NUMERIC(18,2) DEFAULT 0,
  status           VARCHAR(20) DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE','FROZEN','TERMINATED')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- KYC data
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

-- Admin users
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(50) DEFAULT 'CUSTOMER_SUPPORT'
                CHECK (role IN ('SUPER_ADMIN','COMPLIANCE_OFFICER','CUSTOMER_SUPPORT','FINANCE_AUDITOR')),
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
`;

async function setup() {
  console.log('[db:setup] Connecting to database…');

  if (!process.env.DATABASE_URL) {
    console.error('[db:setup] ❌  DATABASE_URL is not set. Aborting.');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log('[db:setup] Running schema migrations…');
    await client.query(schema);
    console.log('[db:setup] ✅  All tables are up to date.');
  } catch (err) {
    console.error('[db:setup] ❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
