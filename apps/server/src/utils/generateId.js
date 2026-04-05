'use strict';

const { randomUUID } = require('crypto');

/**
 * Generates a cryptographically unique identifier.
 *
 * Uses Node.js built-in `crypto.randomUUID` so there is no external
 * dependency and the result is collision-resistant.
 *
 * @returns {string} A UUID v4 string (e.g. "110e8400-e29b-41d4-a716-446655440000").
 */
function generateId() {
  return randomUUID();
}

module.exports = { generateId };
