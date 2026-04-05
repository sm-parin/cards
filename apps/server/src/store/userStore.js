'use strict';

const bcrypt = require('bcryptjs');
const { query } = require('../db/postgres');
const redis = require('../db/redis');

const SESSION_TTL = 24 * 60 * 60; // 24 hours

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a new user.
 * @returns {Promise<{ user?: object, error?: string }>}
 */
async function registerUser(username, password) {
  if (!username || username.trim().length < 2) {
    return { error: 'Username must be at least 2 characters' };
  }
  if (!password || password.length < 6) {
    return { error: 'Password must be at least 6 characters' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await query(
      `INSERT INTO users (username, password)
       VALUES ($1, $2)
       RETURNING id, username, coins, created_at`,
      [username.trim(), passwordHash],
    );
    return { user: rows[0] };
  } catch (err) {
    if (err.code === '23505') {
      return { error: 'Username already taken' };
    }
    throw err;
  }
}

/**
 * Validate credentials and return the public user object.
 * @returns {Promise<{ user?: object, error?: string }>}
 */
async function loginUser(username, password) {
  const { rows } = await query(
    `SELECT id, username, password, coins FROM users WHERE LOWER(username) = LOWER($1)`,
    [username.trim()],
  );

  if (!rows.length) return { error: 'Invalid username or password' };

  const record = rows[0];
  const valid = await bcrypt.compare(password, record.password);
  if (!valid) return { error: 'Invalid username or password' };

  const user = { id: record.id, username: record.username, coins: record.coins };

  // Cache session in Redis
  await redis.set(`session:${user.id}`, user, SESSION_TTL);

  return { user };
}

/**
 * Get public user by ID (Redis cache → Postgres fallback).
 * @param {string} id
 * @returns {Promise<object|null>}
 */
async function getUserById(id) {
  const cached = await redis.get(`session:${id}`);
  if (cached) return cached;

  const { rows } = await query(
    `SELECT id, username, coins FROM users WHERE id = $1`,
    [id],
  );
  if (!rows.length) return null;

  const user = rows[0];
  await redis.set(`session:${id}`, user, SESSION_TTL);
  return user;
}

/**
 * Apply a coin delta atomically, recording a ledger entry.
 * @param {string} userId
 * @param {number} delta
 * @param {string} reason
 * @param {string} [matchId]
 * @returns {Promise<number>} New coin balance.
 */
async function updateCoins(userId, delta, reason, matchId) {
  const client = await require('../db/postgres').getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE users SET coins = coins + $1 WHERE id = $2 RETURNING coins`,
      [delta, userId],
    );

    await client.query(
      `INSERT INTO coin_transactions (user_id, delta, reason, match_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, delta, reason, matchId ?? null],
    );

    await client.query('COMMIT');

    // Invalidate session cache so next fetch reflects new balance
    await redis.del(`session:${userId}`);

    return rows[0].coins;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { registerUser, loginUser, getUserById, updateCoins };
