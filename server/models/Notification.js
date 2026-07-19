const { Schema, model, models } = require('mongoose');

/**
 * notifications collection — single SHARED model across all portals.
 * Any backend may create; the recipient toggles `read` / removes their own.
 * The Student Portal reads + updates only notifications addressed to the
 * signed-in student. strict:false preserves the shared document shape.
 */
const notificationSchema = new Schema({}, { versionKey: false, strict: false });

module.exports = models.Notification || model('Notification', notificationSchema, 'notifications');
