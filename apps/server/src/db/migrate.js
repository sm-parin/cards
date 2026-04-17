'use strict';

const { query } = require('./postgres');

// CREATE TABLE for fresh installs — email-based auth, nickname, bio.
// username is the computed display name (no UNIQUE constraint).
const SQL_CREATE = `
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT,
  username    TEXT,
  nickname    TEXT,
  bio         TEXT,
  password    TEXT NOT NULL,
  coins       INTEGER NOT NULL DEFAULT 1000,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     TEXT NOT NULL,
  winner_team TEXT NOT NULL,
  bid_target  INTEGER NOT NULL,
  played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_players (
  match_id    UUID REFERENCES matches(id),
  user_id     UUID REFERENCES users(id),
  team        TEXT NOT NULL,
  coin_delta  INTEGER NOT NULL,
  PRIMARY KEY (match_id, user_id)
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id),
  delta       INTEGER NOT NULL,
  reason      TEXT NOT NULL,
  match_id    UUID REFERENCES matches(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

// ALTER TABLE for existing installs — adds new columns and relaxes old constraints.
// All operations are idempotent (safe to re-run on every server start).
const SQL_ALTER = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS email    TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio      TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email) WHERE email IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE users ALTER COLUMN username DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE users DROP CONSTRAINT users_username_key;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
`;

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log('Migrations: skipped (no DATABASE_URL — auth/coins unavailable in this mode)');
    return;
  }
  await query(SQL_CREATE);
  await query(SQL_ALTER);
  console.log('Migrations complete');
}

module.exports = { runMigrations };
