const { Schema, model, models } = require('mongoose');

/**
 * departments collection — OWNED by the Admin Portal.
 * The Student Portal READS this collection only (to populate the
 * registration Department dropdown). It never writes it.
 */
const departmentSchema = new Schema(
  {
    id: { type: String, index: true },
    name: { type: String },
    code: { type: String, default: '' },
    status: { type: String, default: 'active' },
    isDeleted: { type: Boolean, default: false },
  },
  { versionKey: false, strict: false }
);

module.exports = models.Department || model('Department', departmentSchema, 'departments');
