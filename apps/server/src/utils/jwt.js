'use strict';

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev_secret_change_in_production';
const EXPIRES_IN = '7d';

/**
 * Issue a signed JWT for a user.
 * @param {{ id: string, username: string, email: string, nickname?: string|null }} user
 * @returns {string} token
 */
function signToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      username: user.username,
      email: user.email || null,
      nickname: user.nickname || null,
    },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

/**
 * Verify a JWT and return its payload.
 * Returns { userId, username } on success.
 * Throws on invalid/expired token.
 */
function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
