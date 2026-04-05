'use strict';

const { query } = require('./postgres');

const SQL = `
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT UNIQUE NOT NULL,
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

async function runMigrations() {
  await query(SQL);
  console.log('Migrations complete');
}

module.exports = { runMigrations };
