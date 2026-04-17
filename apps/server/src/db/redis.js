/**
 * Redis client — three modes:
 * - No-op (local dev, no Redis configured): all operations are silent no-ops;
 *   in-memory store in roomStore.js handles all state.
 * - Local dev (Docker): standard redis package over TCP via REDIS_URL env var.
 * - Production (Upstash): @upstash/redis over HTTP via UPSTASH_REDIS_REST_URL.
 *
 * Switch is automatic:
 *   UPSTASH_REDIS_REST_URL set  → Upstash
 *   REDIS_URL set               → local TCP Redis
 *   neither set                 → no-op (dev only)
 *
 * All consumers (roomStore, userStore) use the same interface: get/set/del/exists/keys
 * and never import a Redis client directly.
 */
 * All consumers (roomStore, userStore) use the same interface: get/set/del/exists/keys
 * and never import a Redis client directly.
 */
'use strict';

let _get, _set, _del, _exists, _keys;
let _connectFn = null;

if (process.env.UPSTASH_REDIS_REST_URL) {
  // ── Upstash (production) ──────────────────────────────────────────────────
  const { Redis } = require('@upstash/redis');

  const client = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  _get = async (key) => {
    const val = await client.get(key);
    // Upstash auto-deserializes JSON — no JSON.parse needed
    return val ?? null;
  };

  _set = async (key, value, ttlSeconds) => {
    if (ttlSeconds) {
      await client.set(key, value, { ex: ttlSeconds });
    } else {
      await client.set(key, value);
    }
  };

  _del = async (...keys) => {
    if (keys.length > 0) await client.del(...keys);
  };

  _exists = async (key) => {
    const result = await client.exists(key);
    return result === 1;
  };

  _keys = async (pattern) => {
    return client.keys(pattern);
  };

  console.log('Redis: using Upstash (HTTP)');

} else if (process.env.REDIS_URL) {
  // ── Standard Redis (local Docker or explicit TCP URL) ────────────────────────────
  const { createClient } = require('redis');

  const client = createClient({ url: process.env.REDIS_URL });

  client.on('error', (err) => console.error('Redis client error:', err));

  _connectFn = () => client.connect();

  _get = async (key) => {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  };

  _set = async (key, value, ttlSeconds) => {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
  };

  _del = async (...keys) => {
    if (keys.length > 0) await client.del(keys);
  };

  _exists = async (key) => {
    return (await client.exists(key)) === 1;
  };

  _keys = async (pattern) => {
    return client.keys(pattern);
  };

  console.log('Redis: using TCP Redis at', process.env.REDIS_URL);

} else {
  // ── No-op (local dev, no Redis configured) ───────────────────────────────────
  // Game state lives entirely in the in-memory roomStore. Redis checkpointing
  // is skipped. Rooms will not survive a server restart, which is fine for dev.
  _get = async () => null;
  _set = async () => {};
  _del = async () => {};
  _exists = async () => false;
  _keys = async () => [];

  console.log('Redis: no-op mode (no REDIS_URL or UPSTASH_REDIS_REST_URL set — in-memory only)');
}

async function connect() {
  if (_connectFn) {
    await _connectFn();
    console.log('Redis connected');
  }
  // Upstash and no-op modes need no explicit connect step
}

module.exports = {
  connect,
  get: _get,
  set: _set,
  del: _del,
  exists: _exists,
  keys: _keys,
};
