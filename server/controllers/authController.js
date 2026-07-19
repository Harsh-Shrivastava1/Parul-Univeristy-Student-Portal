const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const authService = require('../services/authService');
const { recordAudit } = require('../services/auditService');
const { signAccess, signRefresh, verifyRefresh } = require('../utils/auth');
const { clientIp } = require('../utils/http');
const {
  cookieOptions,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  ACCESS_MAX_AGE,
  REFRESH_MAX_AGE,
} = require('../config/env');

/**
 * Issues httpOnly access + refresh cookies for an authenticated student AND
 * returns the raw access token. The token is also sent in the response body so
 * the SPA can attach it as an `Authorization: Bearer` header on cross-portal
 * calls (TEC / Coordinator). This is required when the portals run on different
 * machines/hosts, where the cookie cannot be shared. Cookies remain for the
 * same-host path (fully backward compatible).
 */
function issueSession(res, profile) {
  const claims = { sub: profile.id, role: profile.role, name: profile.name };
  const accessToken = signAccess(claims);
  res.cookie(ACCESS_COOKIE, accessToken, { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
  res.cookie(REFRESH_COOKIE, signRefresh(claims), { ...cookieOptions, maxAge: REFRESH_MAX_AGE });
  return accessToken;
}

// POST /api/auth/register  (public) — self-registration + auto-login
const register = asyncHandler(async (req, res) => {
  const profile = await authService.register(req.body);
  const token = issueSession(res, profile);
  await recordAudit({ action: 'STUDENT_REGISTERED', userId: profile.id, userName: profile.name, entityId: profile.id, ip: clientIp(req) });
  res.status(201).json({ success: true, data: { ...profile, token } });
});

// POST /api/auth/login  (public)
const login = asyncHandler(async (req, res) => {
  const { enrollmentNumber, password } = req.body || {};
  const ip = clientIp(req);
  try {
    const profile = await authService.login(enrollmentNumber, password);
    const token = issueSession(res, profile);
    // Student logins are intentionally NOT audited (routine, high-volume, low
    // value). Registration / password-change / failed-login remain audited.
    res.json({ success: true, data: { ...profile, token } });
  } catch (err) {
    await recordAudit({
      action: 'AUTH_LOGIN_FAILED',
      entity: 'auth',
      ip,
      meta: { enrollmentNumber: typeof enrollmentNumber === 'string' ? enrollmentNumber.slice(0, 40) : null },
    });
    throw err;
  }
});

// POST /api/auth/refresh  (rotation — reissues access + refresh)
const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies && req.cookies[REFRESH_COOKIE];
  if (!token) throw new ApiError(401, 'Not authenticated.');
  let payload;
  try {
    payload = verifyRefresh(token);
  } catch {
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }
  const profile = await authService.getProfile(payload.sub);
  const accessToken = issueSession(res, profile);
  res.json({ success: true, data: { ...profile, token: accessToken } });
});

// GET /api/auth/me  (student)
const me = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.sub);
  res.json({ success: true, data: profile });
});

// POST /api/auth/logout  (student)
const logout = asyncHandler(async (req, res) => {
  res.clearCookie(ACCESS_COOKIE, cookieOptions);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  await recordAudit({ action: 'AUTH_LOGOUT', userId: req.user?.sub, userName: req.user?.name, entityId: req.user?.sub, ip: clientIp(req) });
  res.json({ success: true });
});

// POST /api/auth/change-password  (student)
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  await authService.changePassword(req.user.sub, currentPassword, newPassword);
  await recordAudit({ action: 'PASSWORD_CHANGED', userId: req.user.sub, userName: req.user.name, entityId: req.user.sub, ip: clientIp(req) });
  res.json({ success: true });
});

// POST /api/auth/forgot-password  (public) — emails a temporary password.
// Always returns a generic success so it can't be used to enumerate accounts.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body || {};
  await authService.forgotPassword(email);
  res.json({
    success: true,
    message: 'If an account exists for that email, a temporary password has been sent.',
  });
});

module.exports = { register, login, refresh, me, logout, changePassword, forgotPassword };
