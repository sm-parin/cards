'use strict';

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (err) => {
  console.error('Postgres pool error:', err);
});

/**
 * Run a parameterised query.
 * @param {string} text
 * @param {unknown[]} [params]
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Acquire a client from the pool (remember to call `client.release()`).
 */
async function getClient() {
  return pool.connect();
}

module.exports = { query, getClient, pool };
