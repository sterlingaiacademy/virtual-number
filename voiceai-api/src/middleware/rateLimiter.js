const rateLimit = require('express-rate-limit');

// Global IP-based limiter
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down' },
  keyGenerator: (req) => req.ip,
});

// Authenticated client token limiter
const clientLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded' },
  keyGenerator: (req) => (req.user ? `client:${req.user.id}` : req.ip),
  skip: (req) => !req.user, // Skip if not authenticated (handled by globalLimiter)
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { globalLimiter, clientLimiter, authLimiter };
