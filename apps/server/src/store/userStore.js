'use strict';

const bcrypt = require('bcryptjs');
const { query } = require('../db/postgres');
const redis = require('../db/redis');

const SESSION_TTL = 24 * 60 * 60; // 24 hours

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(password) {
  if (!password || password.length <= 6) return 'Password must be more than 6 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain a lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain a number';
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a new user with email + password.
 * @param {string} email
 * @param {string} password
 * @param {string} [nickname]
 * @returns {Promise<{ user?: object, error?: string }>}
 */
async function registerUser(email, password, nickname) {
  if (!email || !EMAIL_RE.test(email.trim())) {
    return { error: 'Valid email address is required' };
  }

  const pwErr = validatePassword(password);
  if (pwErr) return { error: pwErr };

  const displayName = nickname?.trim() || email.trim().split('@')[0];
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const { rows } = await query(
      `INSERT INTO users (email, username, nickname, password)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, nickname, coins`,
      [email.trim().toLowerCase(), displayName, nickname?.trim() || null, passwordHash],
    );
    return { user: rows[0] };
  } catch (err) {
    if (err.code === '23505') {
      return { error: 'Email already taken' };
    }
    throw err;
  }
}

/**
 * Validate credentials and return the public user object.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ user?: object, error?: string }>}
 */
async function loginUser(email, password) {
  const { rows } = await query(
    `SELECT id, email, username, nickname, bio, password, coins
     FROM users WHERE LOWER(email) = LOWER($1)`,
    [email.trim()],
  );

  if (!rows.length) return { error: 'Invalid email or password' };

  const record = rows[0];
  const valid = await bcrypt.compare(password, record.password);
  if (!valid) return { error: 'Invalid email or password' };

  const user = {
    id: record.id,
    email: record.email,
    username: record.username,
    nickname: record.nickname,
    bio: record.bio,
    coins: record.coins,
  };

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
    `SELECT id, email, username, nickname, bio, coins FROM users WHERE id = $1`,
    [id],
  );
  if (!rows.length) return null;

  const user = rows[0];
  await redis.set(`session:${id}`, user, SESSION_TTL);
  return user;
}

/**
 * Update a user's nickname and bio. Recomputes the display name (username).
 * @param {string} userId
 * @param {{ nickname?: string|null, bio?: string|null }} profile
 * @returns {Promise<{ user?: object, error?: string }>}
 */
async function updateProfile(userId, { nickname, bio }) {
  const current = await getUserById(userId);
  if (!current) return { error: 'User not found' };

  const trimmedNickname = nickname?.trim() || null;
  const displayName = trimmedNickname || (current.email ? current.email.split('@')[0] : current.username);

  const { rows } = await query(
    `UPDATE users
     SET nickname = $1, bio = $2, username = $3
     WHERE id = $4
     RETURNING id, email, username, nickname, bio, coins`,
    [trimmedNickname, bio?.trim() || null, displayName, userId],
  );

  if (!rows.length) return { error: 'User not found' };

  // Invalidate cache so next fetch returns fresh data
  await redis.del(`session:${userId}`);

  return { user: rows[0] };
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

    await redis.del(`session:${userId}`);
    return rows[0].coins;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { registerUser, loginUser, getUserById, updateCoins, updateProfile };
