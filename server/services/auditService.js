const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

// Retention is a TIME policy, never a per-write side effect.
//
// This collection is shared with the sibling portals, whose PUBLIC endpoints
// write audit rows (a failed login needs no account). The previous
// write-triggered 500-row cap therefore let an unauthenticated actor evict the
// Admin portal's records — impersonation, user deletion, settings changes —
// simply by generating traffic.
//
// `timestamp` is stored as an ISO STRING, and a MongoDB TTL index only acts on
// a BSON Date, so it cannot carry the policy. We write a separate `expireAt`
// Date and let the server expire rows on its own schedule. Rows written before
// this change have no `expireAt` and are kept indefinitely, which is the safe
// direction.
//
// Index (created once, see deploy/ENV_REFERENCE.md):
//   db.auditLogs.createIndex({ expireAt: 1 }, { expireAfterSeconds: 0 })

const AUDIT_RETENTION_DAYS = parseInt(process.env.AUDIT_RETENTION_DAYS || '730', 10);

/** Absolute expiry stamp for a new audit row; the TTL monitor reads this. */
function auditExpiry() {
  return new Date(Date.now() + AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

function genId() {
  return `AUD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

/**
 * Append an immutable audit entry to the shared auditLogs collection.
 * Best-effort: an audit failure must never break the primary action.
 */
async function recordAudit({ action, userId, userName, role, entity, entityId, ip, meta }) {
  const entry = {
    id: genId(),
    action,
    userId: userId || null,
    userName: userName || null,
    // The Admin portal shows a Role column for every row in the shared audit
    // collection, and a row without one rendered as a blank badge.
    // This portal authenticates students and nothing else, so that is the default.
    role: role || 'student',
    entity: entity || 'student',
    entityId: entityId || null,
    ip: ip || null,
    meta: meta || null,
    read: false,
    timestamp: new Date().toISOString(),
    expireAt: auditExpiry(),
  };
  try {
    await AuditLog.create(entry);
  } catch (err) {
    if (err.code === 11000) {
      // A duplicate id. Retry once without it — but report a second failure
      // instead of swallowing it: an empty catch here hid the fact that this
      // portal wrote no audit rows at all for a month.
      delete entry.id;
      await AuditLog.create(entry).catch((retryErr) =>
        logger.error('audit_write_failed_after_retry', { action, error: retryErr.message }),
      );
    } else {
      logger.error('audit_write_failed', { action, error: err.message });
    }
  }
  logger.info('audit', { action, userId: entry.userId, ip: entry.ip });
}

module.exports = { recordAudit };
