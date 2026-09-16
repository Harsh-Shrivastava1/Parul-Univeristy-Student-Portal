const { Schema, model, models } = require('mongoose');

/**
 * auditLogs collection — single SHARED, append-only audit trail across portals.
 * strict:false so the portal can record its own action vocabulary
 * (STUDENT_REGISTERED, AUTH_LOGIN, AUTH_LOGIN_FAILED, AUTH_LOGOUT,
 * PASSWORD_CHANGED, PROFILE_UPDATED) alongside sibling-portal actions.
 */
/*
 * `id` MUST be declared as a real path.
 *
 * Mongoose gives every document an `id` VIRTUAL (a string view of _id), so on a
 * bare strict:false schema an assigned `id` is never persisted — the document
 * is stored with no id at all. The shared collection has a unique index on
 * `id`, which permits exactly one such row. One was written on 2026-08-04, and
 * from then on every audit write from this portal failed with E11000 and was
 * swallowed by the writer's catch: the portal logged nothing for months.
 *
 * Declaring it makes the assigned value persist, so rows carry their own id.
 */
const auditSchema = new Schema(
  { id: { type: String } },
  { versionKey: false, strict: false },
);

module.exports = models.AuditLog || model('AuditLog', auditSchema, 'auditLogs');
