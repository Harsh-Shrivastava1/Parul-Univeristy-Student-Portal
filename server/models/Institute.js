const { Schema, model, models } = require('mongoose');

/**
 * institutes collection — Admin-owned master data (39 institutes → academic
 * departments), seeded from the college sheet. READ-ONLY for the Student
 * Portal: used by the signup cascading dropdowns (Institute → Department) and
 * for validating the pair server-side at registration.
 */
const instituteSchema = new Schema(
  {
    id: { type: String, index: true },
    code: { type: String, index: true },
    emailAlias: { type: String, default: '' },
    departments: {
      type: [{ _id: false, name: String, emailAlias: String }],
      default: [],
    },
    createdAt: { type: String },
    updatedAt: { type: String },
  },
  {
    versionKey: false,
    strict: false,
    toJSON: {
      transform(_doc, ret) {
        delete ret._id;
        return ret;
      },
    },
  }
);

module.exports = models.Institute || model('Institute', instituteSchema, 'institutes');
