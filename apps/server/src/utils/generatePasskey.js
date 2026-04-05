'use strict';

const { randomInt } = require('crypto');
const { PASSKEY } = require('../config/constants');

/**
 * Generates a cryptographically random passkey for private rooms.
 *
 * Characters are drawn from a curated charset that excludes visually
 * ambiguous characters (0, O, 1, I) to reduce user-entry errors.
 *
 * @returns {string} A random passkey of length defined by PASSKEY.LENGTH.
 *
 * @example
 * generatePasskey(); // "K7R2MX"
 */
function generatePasskey() {
  const { LENGTH, CHARSET } = PASSKEY;

  let passkey = '';
  for (let i = 0; i < LENGTH; i++) {
    passkey += CHARSET[randomInt(0, CHARSET.length)];
  }

  return passkey;
}

module.exports = { generatePasskey };
