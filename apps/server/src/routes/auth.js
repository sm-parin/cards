'use strict';

const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../store/userStore');
const { signToken } = require('../utils/jwt');

// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const result = await registerUser(username, password);
  if (result.error) return res.status(400).json({ error: result.error });
  const token = signToken(result.user);
  res.json({ token, user: result.user });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await loginUser(username, password);
  if (result.error) return res.status(401).json({ error: result.error });
  const token = signToken(result.user);
  res.json({ token, user: result.user });
});

// GET /auth/me — return fresh profile (coins) for a valid token
router.get('/me', async (req, res) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { verifyToken } = require('../utils/jwt');
  const { getUserById } = require('../store/userStore');
  try {
    const payload = verifyToken(auth.slice(7));
    const user = await getUserById(payload.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
