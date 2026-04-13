const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const User       = require('../models/User.model');
const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  NODE_ENV,
} = require('../config/env');

const BCRYPT_ROUNDS = 12;

const COOKIE_OPTS = {
  httpOnly: true,
  secure:   NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
};

function signAccess(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function signRefresh(userId) {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
}

function userPayload(user) {
  return { id: user._id, username: user.username, email: user.email, role: user.role };
}

// POST /api/auth/register
async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.create({ username, email, passwordHash });

    const accessToken  = signAccess(user._id, user.role);
    const refreshToken = signRefresh(user._id);

    // Store hashed refresh token (so we can invalidate it)
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await User.findByIdAndUpdate(user._id, { refreshTokenHash });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    // Also return refreshToken in body so native clients (Godot) can store it
    res.status(201).json({ accessToken, refreshToken, user: userPayload(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.isBanned) {
      return res.status(403).json({ error: 'This account has been banned' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken  = signAccess(user._id, user.role);
    const refreshToken = signRefresh(user._id);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await User.findByIdAndUpdate(user._id, { refreshTokenHash, lastLogin: new Date() });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTS);
    // Also return refreshToken in body so native clients (Godot) can store it
    res.json({ accessToken, refreshToken, user: userPayload(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/refresh
async function refresh(req, res, next) {
  try {
    // Accept token from cookie (browser) OR from request body (native clients like Godot)
    const token = req.cookies.refreshToken || req.body?.refreshToken;
    if (!token) return res.status(401).json({ error: 'No refresh token' });

    let payload;
    try {
      payload = jwt.verify(token, JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.refreshTokenHash) {
      return res.status(401).json({ error: 'Session invalidated' });
    }

    const valid = await bcrypt.compare(token, user.refreshTokenHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const accessToken = signAccess(user._id, user.role);
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/logout  (requires auth)
async function logout(req, res, next) {
  try {
    await User.findByIdAndUpdate(req.userId, { refreshTokenHash: null });
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me  (requires auth)
async function me(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('-passwordHash -refreshTokenHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, refresh, logout, me };
