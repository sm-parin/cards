'use strict';

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');

const app = express();

// ---------------------------------------------------------------------------
// CORS — allow origins from env var (comma-separated) or localhost defaults
// ---------------------------------------------------------------------------

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:3002'];

app.use(cors({ origin: corsOrigins, credentials: true }));

// ---------------------------------------------------------------------------
// Body parsing
// ---------------------------------------------------------------------------

app.use(express.json());

// ---------------------------------------------------------------------------
// Health check (before auth middleware — Render needs this unauthenticated)
// ---------------------------------------------------------------------------

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// HTTP Routes
// ---------------------------------------------------------------------------

app.use('/auth', authRoutes);

app.get('/', (_req, res) => {
  res.send('Server running');
});

module.exports = app;
