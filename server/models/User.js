const { Schema, model, models } = require('mongoose');

/**
 * users collection — shared across all four portals.
 * The Student Portal is the SOLE writer of role='student' accounts
 * (self-registration). Admin owns all other roles + activation/deactivation.
 * Link to the student profile: users.studentId -> students.id (1:1).
 */
const userSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    // Unique across the shared users collection — enforces email uniqueness at
    // the DB, not just in application code (prevents registration races).
    email: { type: String, required: true, unique: true, index: true },
    role: { type: String, required: true, default: 'student' },
    studentId: { type: String, default: null, index: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    passwordHash: { type: String, required: true },
    lastLoginAt: { type: String, default: null },
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: String, default: null },
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  {
    versionKey: false,
    // Keep the on-write shape lean; never leak the password hash.
    toJSON: {
      transform(_doc, ret) {
        delete ret._id;
        delete ret.passwordHash;
        return ret;
      },
    },
    toObject: {
      transform(_doc, ret) {
        delete ret._id;
        return ret;
      },
    },
  }
);

module.exports = models.User || model('User', userSchema, 'users');
