const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints (login / register / change-password).
 * Protects against brute force + enumeration without affecting authenticated
 * API performance (applied only to the auth mutation routes).
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // Students register/log in from a shared campus NAT (the whole campus is one
  // public IP), so the cap must absorb a peak cohort logging in together while
  // still stopping brute force. 300/15min per IP is comfortable for realistic
  // login volume (logins are infrequent — a login yields a 15min access token +
  // 7day refresh) yet trivially blocks credential stuffing against bcrypt(12).
  max: 300, // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Please try again later.' },
});

module.exports = { authLimiter };
