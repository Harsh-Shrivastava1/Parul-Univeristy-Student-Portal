const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints (login / register / change-password).
 * Protects against brute force + enumeration without affecting authenticated
 * API performance (applied only to the auth mutation routes).
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // Students register/log in from shared campus NAT (many users behind one IP),
  // so a very low cap locks out legitimate cohorts. 100/15min per IP still caps
  // brute force while comfortably absorbing a class registering together.
  max: 100, // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Please try again later.' },
});

module.exports = { authLimiter };
