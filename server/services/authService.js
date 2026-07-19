const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const ApiError = require('../utils/ApiError');
const { hashPassword, comparePassword } = require('../utils/auth');
const { MAX, isEmail } = require('../utils/validation');
const { env } = require('../config/env');
const { sendTemplateEmail } = require('./email/mailer');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate a random temporary password that satisfies the change-password
 * policy (>= 8 chars, at least one letter and one digit). Cryptographically
 * random via crypto.randomBytes.
 */
function generateTempPassword() {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = letters + digits;
  const bytes = crypto.randomBytes(10);
  let out = letters[bytes[0] % letters.length] + digits[bytes[1] % digits.length];
  for (let i = 2; i < 10; i++) out += all[bytes[i] % all.length];
  return out; // e.g. "Kd7mQ9r2xB"
}

/** Merged user + student view matching the Student Portal `User` type. */
function toProfile(user, student) {
  const s = student || {};
  return {
    id: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
    enrollmentNumber: s.enrollmentNumber || '',
    department: s.department || '',
    semester: s.semester || 0,
    contact: s.contactNumber || '',
    address: s.address || '',
    cgpa: s.cgpa || 0,
    skills: s.skills || [],
    linkedIn: s.linkedIn || '',
    portfolio: s.portfolio || '',
    emergencyContact: s.emergencyContact || '',
    // Academic + personal details. Persisted from the application form so the
    // student fills them once and every future application pre-fills from here.
    fatherName: s.fatherName || '',
    motherName: s.motherName || '',
    dateOfBirth: s.dateOfBirth || '',
    gender: s.gender || '',
    languages: Array.isArray(s.languages) ? s.languages : [],
    backlogs: typeof s.backlogs === 'number' ? s.backlogs : 0,
    attendance: typeof s.attendance === 'number' ? s.attendance : 0,
    spiScores: s.spiScores && typeof s.spiScores === 'object' ? s.spiScores : {},
  };
}

function validateRegister(p) {
  if (!p || typeof p !== 'object') return 'Invalid registration payload.';
  const name = String(p.fullName || '').trim();
  if (name.length < 2) return 'Please enter your full name.';
  if (name.length > MAX.name) return `Full name must be at most ${MAX.name} characters.`;
  const enrollment = String(p.enrollmentNumber || '').trim();
  if (!/^[A-Za-z0-9]+$/.test(enrollment)) return 'Enter a valid alphanumeric enrollment number.';
  if (enrollment.length > 40) return 'Enrollment number is too long.';
  if (!p.department) return 'Please select your department.';
  if (String(p.department).length > MAX.name) return 'Invalid department.';
  const sem = Number(p.semester);
  if (!sem || sem < 1 || sem > 8) return 'Please select a valid semester.';
  const email = String(p.email || '').trim();
  if (!isEmail(email) || email.length > MAX.email) return 'Enter a valid email address.';
  const pw = String(p.password || '');
  if (pw.length < 8 || pw.length > MAX.password || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
    return 'Password must be 8-200 characters and include a letter and a number.';
  }
  return null;
}

function isTxnUnsupported(err) {
  const msg = (err && err.message) || '';
  return (
    err &&
    (err.code === 20 ||
      err.codeName === 'IllegalOperation' ||
      /replica set|Transaction numbers are only allowed|transactions are not supported/i.test(msg))
  );
}

/**
 * Create the users + students documents atomically and link them 1:1.
 * Uses a MongoDB transaction (Atlas / replica set). Falls back to a
 * sequential create with manual rollback on standalone Mongo.
 */
async function createLinkedAtomic(userData, studentData) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await Student.create([studentData], { session });
      await User.create([userData], { session });
    });
    return;
  } catch (err) {
    if (!isTxnUnsupported(err)) throw err;
    // Fallback: no replica set. Sequential with compensating rollback.
    await Student.create(studentData);
    try {
      await User.create(userData);
    } catch (userErr) {
      await Student.deleteOne({ id: studentData.id }); // remove orphaned profile
      throw userErr;
    }
  } finally {
    session.endSession();
  }
}

// ─── Operations ───────────────────────────────────────────────────────────────

/**
 * Student self-registration. Source of truth for validation, uniqueness,
 * hashing, and the atomic users+students creation + linkage.
 */
async function register(payload) {
  const error = validateRegister(payload);
  if (error) throw new ApiError(400, error);

  const enrollmentNumber = String(payload.enrollmentNumber).trim();
  const email = String(payload.email).trim().toLowerCase();

  const [emailTaken, enrollTaken] = await Promise.all([
    User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, 'i') }).lean(),
    Student.findOne({ enrollmentNumber }).lean(),
  ]);
  if (emailTaken) throw new ApiError(409, 'An account with this email is already registered.');
  if (enrollTaken) throw new ApiError(409, 'An account with this enrollment number already exists.');

  const now = new Date().toISOString();
  const passwordHash = await hashPassword(String(payload.password));
  const studentDocId = genId('ST');
  const userDocId = genId('USR');
  const fullName = String(payload.fullName).trim();

  const studentData = {
    id: studentDocId,
    studentId: studentDocId,
    userId: userDocId,
    studentName: fullName,
    name: fullName,
    enrollmentNumber,
    department: payload.department,
    semester: Number(payload.semester),
    email,
    contactNumber: '',
    cgpa: 0,
    skills: [],
    address: '',
    linkedIn: '',
    portfolio: '',
    emergencyContact: '',
    createdAt: now,
    updatedAt: now,
  };

  const userData = {
    id: userDocId,
    name: fullName,
    email,
    role: 'student',
    studentId: studentDocId,
    status: 'active',
    passwordHash,
    lastLoginAt: null,
    isDeleted: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await createLinkedAtomic(userData, studentData);
  } catch (err) {
    // Race-safe backstop: the unique indexes catch duplicates that slipped past
    // the pre-check above. Map E11000 to a friendly conflict message.
    if (err && (err.code === 11000 || err.code === 11001)) {
      const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : '';
      if (field === 'email') throw new ApiError(409, 'An account with this email is already registered.');
      if (field === 'enrollmentNumber') throw new ApiError(409, 'An account with this enrollment number already exists.');
      throw new ApiError(409, 'An account with these details already exists.');
    }
    throw err;
  }

  const user = await User.findOne({ id: userDocId }).lean();
  const student = await Student.findOne({ id: studentDocId }).lean();

  // Fire-and-forget welcome email. Best-effort: never awaited, never throws,
  // so a mail failure can never block or roll back the registration.
  void sendTemplateEmail({
    to: email,
    toName: fullName,
    template: 'welcome',
    data: {
      name: fullName,
      email,
      enrollmentNumber,
      department: payload.department,
      loginUrl: env.loginUrl || env.frontendOrigin,
    },
  }).catch(() => {});

  return toProfile(user, student);
}

/** Student login by enrollment number + password. */
async function login(enrollmentNumber, password) {
  if (!enrollmentNumber || !password) {
    throw new ApiError(400, 'Enrollment number and password are required.');
  }
  const enrollment = String(enrollmentNumber).trim();

  const student = await Student.findOne({ enrollmentNumber: enrollment }).lean();
  const user = student
    ? await User.findOne({
        role: 'student',
        $or: [{ id: student.userId }, { studentId: student.id }],
      }).lean()
    : null;

  // Uniform error to avoid leaking which field was wrong.
  if (!student || !user || user.isDeleted) {
    throw new ApiError(401, 'Invalid enrollment number or password.');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'Your account has been deactivated. Please contact administration.');
  }
  const ok = await comparePassword(String(password), user.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid enrollment number or password.');

  await User.updateOne({ id: user.id }, { $set: { lastLoginAt: new Date().toISOString() } });
  return toProfile(user, student);
}

/** Current authenticated student's merged profile. */
async function getProfile(userId) {
  const user = await User.findOne({ id: userId, role: 'student' }).lean();
  if (!user) throw new ApiError(404, 'Account not found.');
  const student = await Student.findOne({
    $or: [{ id: user.studentId }, { userId: user.id }],
  }).lean();
  return toProfile(user, student);
}

/** Self-service password change. */
async function changePassword(userId, currentPassword, newPassword) {
  const pw = String(newPassword || '');
  if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
    throw new ApiError(400, 'New password must be at least 8 characters and include a letter and a number.');
  }
  const user = await User.findOne({ id: userId, role: 'student' }).lean();
  if (!user) throw new ApiError(404, 'Account not found.');
  const ok = await comparePassword(String(currentPassword || ''), user.passwordHash);
  if (!ok) throw new ApiError(401, 'Current password is incorrect.');

  const passwordHash = await hashPassword(pw);
  await User.updateOne(
    { id: userId },
    { $set: { passwordHash, updatedAt: new Date().toISOString() } }
  );
}

/**
 * Forgot-password: issue a temporary password to the account's email.
 * Resolves silently whether or not the email is registered (no account
 * enumeration). When it matches an active student, a new temp password is set
 * and emailed via the shared `password_reset` template.
 */
async function forgotPassword(email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!isEmail(normalizedEmail)) {
    throw new ApiError(400, 'Enter a valid email address.');
  }

  const user = await User.findOne({ email: normalizedEmail, role: 'student' }).lean();
  // Silent no-op for unknown / inactive accounts — do not reveal existence.
  if (!user || user.isDeleted || user.status !== 'active') return;

  const student = await Student.findOne({
    $or: [{ id: user.studentId }, { userId: user.id }],
  }).lean();
  const displayName = student?.studentName || student?.name || user.name;

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await User.updateOne(
    { id: user.id },
    { $set: { passwordHash, updatedAt: new Date().toISOString() } }
  );

  // Fire-and-forget: a mail failure must not change the generic API response.
  void sendTemplateEmail({
    to: normalizedEmail,
    toName: displayName,
    template: 'password_reset',
    data: {
      name: displayName,
      email: normalizedEmail,
      enrollmentNumber: student?.enrollmentNumber,
      tempPassword,
      loginUrl: env.loginUrl || env.frontendOrigin,
    },
  }).catch(() => {});
}

module.exports = { register, login, getProfile, changePassword, forgotPassword, toProfile };
