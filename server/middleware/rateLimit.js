const rateLimit = require('express-rate-limit');
const { MongoRateStore } = require('./mongoRateStore');

/**
 * Rate limiter for authentication endpoints (login / register / change-password).
 * Protects against brute force + enumeration without affecting authenticated
 * API performance (applied only to the auth mutation routes).
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  // Students register/log in from a shared campus NAT (the whole campus is one
  // public IP), so the cap must absorb a peak cohort logging in together while
  // still stopping brute force. 500/15min per IP is comfortable for realistic
  // login volume (logins are infrequent — a login yields a 15min access token +
  // 7day refresh) yet trivially blocks credential stuffing against bcrypt(12).
  max: 500, // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  // Shared count across PM2 cluster workers (no Redis). Fails open on DB issues.
  store: new MongoRateStore('student-auth'),
  passOnStoreError: true,
  message: { success: false, error: 'Too many attempts. Please try again later.' },
});

module.exports = { authLimiter };
