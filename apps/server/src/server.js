'use strict';

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const { initSockets } = require('./sockets');
const redis = require('./db/redis');
const { runMigrations } = require('./db/migrate');

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Socket.IO
// ---------------------------------------------------------------------------

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:3002'];

const io = new Server(server, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

initSockets(io);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 5000;

async function start() {
  await redis.connect();
  await runMigrations();

  server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    if (!process.env.DATABASE_URL) {
      console.warn('WARNING: DATABASE_URL not set — auth endpoints and coin tracking are disabled');
    }
  });
}

module.exports = { start };
