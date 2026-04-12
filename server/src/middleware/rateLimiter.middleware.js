const rateLimit = require('express-rate-limit');

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs:        15 * 60 * 1000, // 15 minutes
  max:             10,
  message:         { error: 'Too many login attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// General API limiter
const apiLimiter = rateLimit({
  windowMs:        60 * 1000, // 1 minute
  max:             120,
  message:         { error: 'Too many requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

module.exports = { authLimiter, apiLimiter };
