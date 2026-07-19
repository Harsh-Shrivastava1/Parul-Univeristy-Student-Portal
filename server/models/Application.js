const { Schema, model, models } = require('mongoose');

/**
 * applications collection — OWNED by the TEC Cell Portal (recruitment pipeline).
 * The Student Portal READS its own applications, and creates one on "apply".
 *
 * NOTE ON OWNERSHIP: creating/writing an application is a TEC-owned operation.
 * It is hosted here temporarily because the TEC backend does not yet expose a
 * student-authenticated create endpoint. The frontend already targets the TEC
 * API base (VITE_TEC_API_URL); relocating this write to the TEC backend is a
 * lift-and-shift with no frontend change. The Student Portal never mutates any
 * OTHER TEC field — only appends a new application document on the student's behalf.
 *
 * strict:false preserves the canonical TEC document shape.
 */
const applicationSchema = new Schema({}, { versionKey: false, strict: false });

module.exports = models.Application || model('Application', applicationSchema, 'applications');
