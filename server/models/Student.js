const { Schema, model, models } = require('mongoose');

/**
 * students collection — OWNED by the Student Portal.
 * strict:false preserves the sibling-portal read shape.
 *
 * Field ownership:
 *   Student (write once at registration, then IMMUTABLE): enrollmentNumber, department, semester
 *   Student (self-service, editable): contactNumber, email, address, skills, linkedIn, portfolio, emergencyContact
 *   Admin (governance only): activation via the linked users document
 * Coordinator and TEC never write this collection.
 */
const studentSchema = new Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    studentId: { type: String, index: true },
    userId: { type: String, default: null, index: true }, // link -> users.id
    studentName: { type: String },
    name: { type: String },
    // Set at registration. NULLABLE because an Admin can RELEASE a claim (see
    // the Admin portal's enrollment command) — a released row legitimately
    // holds null, and several may do so at once. Registration itself still
    // requires a value; that check lives in services/authService.js.
    //
    // Uniqueness is enforced by the partial index declared below, NOT by
    // `unique: true` here. Two reasons: a plain unique index would reject the
    // second released row, and Mongoose never alters an index that already
    // exists — the field carried `unique: true` for a long time while the
    // deployed index had no such flag, so nothing was actually enforced.
    enrollmentNumber: { type: String, default: null, index: true },
    institute: { type: String, default: '' }, // immutable after registration (Admin-only edit)
    department: { type: String }, // immutable after registration
    semester: { type: Number }, // immutable after registration
    email: { type: String, index: true },
    contactNumber: { type: String, default: '' },
    cgpa: { type: Number, default: 0 },
    skills: { type: [String], default: [] },
    address: { type: String, default: '' },
    linkedIn: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    emergencyContact: { type: String, default: '' },
    // Academic + personal details — filled once via the application form and
    // reused (pre-filled) on every future application.
    fatherName: { type: String, default: '' },
    motherName: { type: String, default: '' },
    dateOfBirth: { type: String, default: '' },
    gender: { type: String, default: '' },
    languages: { type: [String], default: [] },
    backlogs: { type: Number, default: 0 },
    attendance: { type: Number, default: 0 },
    // Nested path (not a subdocument) so Mongoose does not inject a stray _id.
    spiScores: {
      sem1: { type: Number }, sem2: { type: Number }, sem3: { type: Number }, sem4: { type: Number },
      sem5: { type: Number }, sem6: { type: Number }, sem7: { type: Number }, sem8: { type: Number },
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
    toObject: {
      transform(_doc, ret) {
        delete ret._id;
        return ret;
      },
    },
  }
);

// Uniqueness on real enrollment numbers only. The partial filter keeps released
// rows (null) out of the index, so any number of accounts may sit released while
// no two accounts can hold the same number.
studentSchema.index(
  { enrollmentNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { enrollmentNumber: { $type: 'string' } },
    name: 'enrollmentNumber_unique',
  },
);

module.exports = models.Student || model('Student', studentSchema, 'students');
