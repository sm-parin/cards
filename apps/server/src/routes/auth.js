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

module.exports = router;
