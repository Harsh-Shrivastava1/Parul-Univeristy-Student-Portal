require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

/** Require an env var; throw at startup if missing (no silent dev fallback). */
function required(key) {
  const v = process.env[key];
  if (v === undefined || v === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return v;
}

/**
 * Student Portal backend configuration.
 * Connects to the SAME shared MongoDB Atlas database (parul_internship_system)
 * used by the Admin, TEC Cell and Coordinator portals.
 */
const env = {
  port: parseInt(process.env.PORT || '5002', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd,
  frontendOrigins: (
    process.env.FRONTEND_ORIGINS ||
    'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:3000'
  ).split(',').map((s) => s.trim()),

  mongoUri: process.env.MONGODB_URI || '',
  mongoDbName: process.env.MONGODB_DB_NAME || 'parul_internship_system',

  jwt: {
    // REQUIRED — the server must never run with default authentication secrets.
    // JWT_ACCESS_SECRET must equal the TEC backend's STUDENT_JWT_ACCESS_SECRET
    // (the TEC backend verifies student tokens with it).
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTtl: process.env.REFRESH_TOKEN_TTL || '7d',
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),

  // Primary SPA origin used as the login/CTA link inside branded emails.
  frontendOrigin: (
    process.env.FRONTEND_ORIGIN ||
    (process.env.FRONTEND_ORIGINS || 'http://localhost:5173').split(',')[0]
  ).trim(),
  loginUrl:
    process.env.LOGIN_URL ||
    (process.env.FRONTEND_ORIGIN ||
      (process.env.FRONTEND_ORIGINS || 'http://localhost:5173').split(',')[0]).trim(),

  // Email is OPTIONAL and graceful — never required(). With no SMTP host the
  // mailer falls back to an Ethereal test inbox (preview URLs, no real send).
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure:
      process.env.SMTP_SECURE === 'true' ||
      parseInt(process.env.SMTP_PORT || '587', 10) === 465,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from:
      process.env.MAIL_FROM ||
      process.env.EMAIL_FROM ||
      'Internship Management System <no-reply@icmp.local>',
    provider: process.env.SMTP_HOST ? 'gmail-smtp' : 'ethereal',
  },
};

/**
 * Cookie policy. Same-site deployment (Student SPA + backend behind one origin,
 * or all on *.localhost) uses the stricter SameSite=Strict default. If the SPA
 * and API are served cross-site, set COOKIE_SAMESITE=none (which forces
 * Secure=true) — required for the browser to send the auth cookie cross-site.
 */
const sameSite = (process.env.COOKIE_SAMESITE || 'strict').toLowerCase();
const secureCookie = sameSite === 'none' ? true : process.env.COOKIE_SECURE
  ? process.env.COOKIE_SECURE === 'true'
  : isProd;

const cookieOptions = {
  httpOnly: true,
  secure: secureCookie,
  sameSite,
  path: '/',
};

const ACCESS_COOKIE = 'student_access';
const REFRESH_COOKIE = 'student_refresh';
const ACCESS_MAX_AGE = 15 * 60 * 1000; // 15 minutes — matches ACCESS_TOKEN_TTL
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days — matches REFRESH_TOKEN_TTL

module.exports = {
  env,
  cookieOptions,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
};
