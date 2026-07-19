const { verifyAccess } = require('../utils/auth');
const { ACCESS_COOKIE } = require('../config/env');
const ApiError = require('../utils/ApiError');

/** Extract a bearer token from the Authorization header, if present. */
function bearerToken(req) {
  const h = req.headers && req.headers.authorization;
  return h && h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

/**
 * Requires a valid access token; attaches req.user = { sub, role, name }.
 * Accepts the token from either the `Authorization: Bearer` header (used by the
 * SPA, works cross-host) or the httpOnly access cookie (same-host fallback).
 */
function requireAuth(req, res, next) {
  const token = bearerToken(req) || (req.cookies && req.cookies[ACCESS_COOKIE]);
  if (!token) return next(new ApiError(401, 'Not authenticated.'));
  try {
    req.user = verifyAccess(token);
    return next();
  } catch {
    return next(new ApiError(401, 'Session expired. Please sign in again.'));
  }
}

/** Restricts a route to student accounts only. */
function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return next(new ApiError(403, 'Student access only.'));
  }
  return next();
}

module.exports = { requireAuth, requireStudent };
