const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

// The shared auditLogs collection is capped at MAX_AUDIT records. After each
// write, the oldest entries beyond the cap are evicted (rolling window).
const MAX_AUDIT = 500;

function genId() {
  return `AUD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

async function enforceAuditCap() {
  try {
    const total = await AuditLog.countDocuments();
    if (total <= MAX_AUDIT) return;
    const oldest = await AuditLog.find({}, { _id: 1 })
      .sort({ timestamp: 1 })
      .limit(total - MAX_AUDIT)
      .lean();
    if (oldest.length) {
      await AuditLog.deleteMany({ _id: { $in: oldest.map((o) => o._id) } });
    }
  } catch (err) {
    logger.error('audit_cap_failed', { error: err.message });
  }
}

/**
 * Append an immutable audit entry to the shared auditLogs collection.
 * Best-effort: an audit failure must never break the primary action.
 */
async function recordAudit({ action, userId, userName, entity, entityId, ip, meta }) {
  const entry = {
    id: genId(),
    action,
    userId: userId || null,
    userName: userName || null,
    entity: entity || 'student',
    entityId: entityId || null,
    ip: ip || null,
    meta: meta || null,
    read: false,
    timestamp: new Date().toISOString(),
  };
  try {
    await AuditLog.create(entry);
    await enforceAuditCap();
  } catch (err) {
    logger.error('audit_write_failed', { action, error: err.message });
  }
  logger.info('audit', { action, userId: entry.userId, ip: entry.ip });
}

module.exports = { recordAudit };
