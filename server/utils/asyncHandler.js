/**
 * Wraps an async route handler so rejected promises reach the error handler.
 *
 * For idempotent GET reads we retry a few times on transient Atlas connection
 * blips (M0 intermittently aborts TLS handshakes with "SSL alert number 80";
 * a fresh attempt almost always succeeds). Non-GET requests are NEVER retried,
 * to avoid double-executing a write. Retry only happens before any bytes are
 * sent (res.headersSent guard).
 */
const TRANSIENT_MSG = /SSL alert|ECONNRESET|socket hang up|connection.*clos|pool.*clear|topology.*clos/i;
const TRANSIENT_NAMES = new Set([
  'MongoNetworkError',
  'MongoPoolClearedError',
  'MongoServerSelectionError',
  'MongoNetworkTimeoutError',
]);

function isTransient(err) {
  if (!err) return false;
  if (TRANSIENT_NAMES.has(err.name)) return true;
  return TRANSIENT_MSG.test(err.message || '');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const asyncHandler = (fn) => async (req, res, next) => {
  const maxAttempts = req.method === 'GET' ? 3 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await fn(req, res, next);
      return;
    } catch (err) {
      if (attempt < maxAttempts && !res.headersSent && isTransient(err)) {
        await sleep(150 * attempt);
        continue;
      }
      next(err);
      return;
    }
  }
};

module.exports = asyncHandler;
