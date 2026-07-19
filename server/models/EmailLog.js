const { Schema, model, models } = require('mongoose');

/**
 * emailLogs collection — single SHARED, append-only email delivery log across
 * portals. Fields are declared explicitly (so the string `id` persists and
 * matches the shared collection's unique `id_1` index — an empty schema would
 * let Mongoose's built-in `id` virtual swallow it and store id:null). strict:false
 * keeps it forward-compatible with any sibling-portal fields; no enum on
 * `template` so any portal's template vocabulary is accepted.
 */
const emailLogSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    recipient: { type: String, required: true },
    recipientName: { type: String, default: '' },
    applicationId: { type: String, default: '' },
    template: { type: String, required: true },
    subject: { type: String, default: '' },
    sentBy: { type: String, default: 'system' },
    sentByName: { type: String, default: 'System' },
    sentAt: { type: String, required: true },
    deliveryStatus: { type: String, required: true },
    previewUrl: { type: String, default: null },
    error: { type: String, default: null },
    provider: { type: String, default: 'smtp' },
    messageId: { type: String, default: null },
    retryCount: { type: Number, default: 0 },
  },
  { versionKey: false, strict: false },
);

module.exports = models.EmailLog || model('EmailLog', emailLogSchema, 'emailLogs');
