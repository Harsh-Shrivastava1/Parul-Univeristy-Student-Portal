const { env } = require('../config/env');

/**
 * Origin-based CSRF defence for cookie-authenticated requests.
 *
 * Session authority here rides on a cookie the browser attaches automatically.
 * When the deployment sets COOKIE_SAMESITE=none — which the Render blueprint
 * does, because the frontend and backend are on different sites — the browser
 * also attaches it to requests a hostile page makes. `express.urlencoded` means
 * a plain cross-site HTML form is a "simple request": no preflight runs, so
 * CORS never gets to reject it, and the write lands.
 *
 * The fix is to require proof that a state-changing request came from the
 * application. Every browser sends `Origin` on a cross-origin request and on a
 * same-origin non-GET, so an allowlist check is sufficient and needs no token
 * plumbing through the client.
 *
 * Safe methods are exempt. A request with no usable origin is REJECTED rather
 * than allowed — failing open here would defeat the whole control.
 */

/** Reduce a Referer URL to its origin; returns null when unparseable. */
function originOfReferer(referer) {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

const allowed = new Set(
  (env.frontendOrigins || []).filter(Boolean).map((o) => String(o).replace(/\/+$/, '')),
);

function csrfGuard(req, res, next) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const origin = req.get('origin') || originOfReferer(req.get('referer'));
  if (origin && allowed.has(String(origin).replace(/\/+$/, ''))) {
    return next();
  }

  console.warn(`[csrf] rejected ${req.method} ${req.path} from origin=${origin || 'none'}`);
  return res.status(403).json({
    success: false,
    error: 'Cross-site request rejected. This endpoint only accepts requests from the application.',
  });
}

module.exports = { csrfGuard };
