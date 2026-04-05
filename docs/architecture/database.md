# Database Architecture

## Postgres (Neon)

Neon is a serverless Postgres provider. The connection string is provided via `DATABASE_URL`. Migrations run at server startup via `runMigrations()` in `db/migrate.js` using `CREATE TABLE IF NOT EXISTS` — idempotent, safe to run on every deploy.

### Table: users
```
id          UUID PK, gen_random_uuid()
username    TEXT UNIQUE NOT NULL
password    TEXT NOT NULL (bcrypt hash)
coins       INTEGER NOT NULL DEFAULT 1000
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
```
New users start with 1000 coins. `username` is the unique identifier for login — no email. Passwords are hashed with bcryptjs before storage.

### Table: matches
```
id          UUID PK
room_id     TEXT NOT NULL
winner_team TEXT NOT NULL
bid_target  INTEGER NOT NULL
played_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
```
One row per completed game. `winner_team` is a string ("bidding" / "opponent" for BQ). `bid_target` stores the winning bid for historical reference. `room_id` is not a FK — rooms are ephemeral and may be deleted before the match record is written.

### Table: match_players
```
match_id    UUID REFERENCES matches(id)
user_id     UUID REFERENCES users(id)
team        TEXT NOT NULL
coin_delta  INTEGER NOT NULL
PRIMARY KEY (match_id, user_id)
```
One row per player per match. `coin_delta` records how many coins that player won or lost in this match (+200 win / -50 loss for BQ; +100 win / -200 loss for JT).

Note: A `stats` JSONB column was discussed for per-player game statistics but was not implemented. The composite primary key leaves no natural place to add it without a schema migration.

### Table: coin_transactions
```
id          UUID PK
user_id     UUID REFERENCES users(id)
delta       INTEGER NOT NULL
reason      TEXT NOT NULL
match_id    UUID REFERENCES matches(id)
created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
```
Append-only ledger. Every coin change is recorded here with a reason string. This table is never updated — only inserted into. It exists as an audit trail separate from the `coins` balance on `users`. The `users.coins` column is the live balance; `coin_transactions` is the history.

Do not add UPDATE or DELETE operations on this table. If a correction is needed, insert a compensating row with a negative `delta`.

## Redis (Upstash in production, Docker TCP locally)

The dual-mode Redis client in `db/redis.js` auto-detects the environment based on `UPSTASH_REDIS_REST_URL`. Both modes expose the same interface: `get`, `set`, `del`, `exists`, `keys`. Consumers never import a Redis client directly.

### Key patterns and TTLs

| Key pattern            | Content                        | TTL       |
|------------------------|--------------------------------|-----------|
| `room:{roomId}:lobby`  | Full room object (waiting)     | 30 minutes |
| `game:{roomId}:state`  | Full room object (playing)     | 2 hours   |
| `user:{userId}`        | User profile cache             | see userStore.js |

When a room transitions from waiting to playing, `startGame()` deletes the `lobby` key and writes to the `game` key. When a room is deleted, both keys are deleted.

### What is NOT in Redis

Mid-game mutations are not written to Redis:
- Individual bids after PLACE_BID
- Card plays after PLAY_CARD
- Partner selection state
- Turn index changes

These live only in the `rooms` object in server memory (`db/roomStore.js`). This is a deliberate trade-off — see ADR-006 for reasoning.

### redis.keys() warning
`keys(pattern)` is an O(N) Redis scan. It is safe for admin/debug use but must never be called in a per-event hot path (e.g. on every card play). The current codebase does not call it in hot paths.

## Query patterns

All Postgres access goes through `db/postgres.js` which wraps `pg.Pool`. The two methods are:
- `query(text, params)` — for simple queries
- `getClient()` — for transactions (acquire, query, release/rollback)

Coin distribution at game end is done in a transaction: match insert → match_players insert → coin_transactions insert → users.coins update. If any step fails, the entire transaction rolls back and no coins change.
