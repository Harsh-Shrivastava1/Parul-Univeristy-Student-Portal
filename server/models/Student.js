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
    // Unique at the DB level — the authoritative guard against duplicate
    // enrollment registration (app-level checks alone are racy). Immutable.
    enrollmentNumber: { type: String, required: true, unique: true, index: true },
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

module.exports = models.Student || model('Student', studentSchema, 'students');
