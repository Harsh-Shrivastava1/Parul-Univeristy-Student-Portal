const { Schema, model, models } = require('mongoose');

/**
 * auditLogs collection — single SHARED, append-only audit trail across portals.
 * strict:false so the Student Portal can record its own action vocabulary
 * (STUDENT_REGISTERED, AUTH_LOGIN, AUTH_LOGIN_FAILED, AUTH_LOGOUT,
 * PASSWORD_CHANGED, PROFILE_UPDATED) alongside sibling-portal actions.
 */
const auditSchema = new Schema({}, { versionKey: false, strict: false });

module.exports = models.AuditLog || model('AuditLog', auditSchema, 'auditLogs');
