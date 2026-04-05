/**
 * Redis client — dual mode:
 * - Local dev (Docker): standard redis package over TCP
 * - Production (Upstash): @upstash/redis over HTTP
 *
 * Switch is automatic based on presence of UPSTASH_REDIS_REST_URL env var.
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

} else {
  // ── Standard Redis (local Docker) ────────────────────────────────────────
  const { createClient } = require('redis');

  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

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

  console.log('Redis: using local Docker Redis (TCP)');
}

async function connect() {
  if (_connectFn) {
    await _connectFn();
    console.log('Redis connected');
  }
  // Upstash needs no explicit connect step
}

module.exports = {
  connect,
  get: _get,
  set: _set,
  del: _del,
  exists: _exists,
  keys: _keys,
};
