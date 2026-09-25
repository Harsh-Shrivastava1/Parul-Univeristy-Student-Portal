const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Institute = require('../models/Institute');
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
/** Password-reset links are short-lived; a stale link must not stay usable. */
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
/** Verification links last a day: people check college mail on their own schedule. */
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** Mint a link token: the raw value is emailed, only its hash is stored. */
function mintToken(ttlMs) {
  const raw = crypto.randomBytes(32).toString('hex');
  return {
    raw,
    hash: crypto.createHash('sha256').update(raw).digest('hex'),
    expiresAt: new Date(Date.now() + ttlMs).toISOString(),
  };
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
    institute: s.institute || '',
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
    degree: s.degree || '',
    passingYear: s.passingYear || '',
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
  if (!p.institute) return 'Please select your institute.';
  if (String(p.institute).length > MAX.name) return 'Invalid institute.';
  if (!p.department) return 'Please select your department.';
  if (String(p.department).length > MAX.name) return 'Invalid department.';
  const sem = Number(p.semester);
  if (!sem || sem < 1 || sem > 8) return 'Please select a valid semester.';
  const email = String(p.email || '').trim();
  if (!isEmail(email) || email.length > MAX.email) return 'Enter a valid email address.';
  // Students may only self-register with an official Parul University email.
  if (!/@paruluniversity\.ac\.in$/i.test(email)) {
    return 'Only official Parul University email addresses (@paruluniversity.ac.in) are allowed.';
  }
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

  // Deleted accounts must not block a new one. An administrator removing a
  // student soft-deletes the user and releases the enrollment number, but the
  // rows stay — applications and trainings point at them. Matching those here
  // would lock the person out of the portal permanently, with "already
  // registered" and no way forward.
  const notDeleted = { isDeleted: { $ne: true } };
  const [emailTaken, enrollTaken] = await Promise.all([
    User.findOne({ email: new RegExp(`^${escapeRegex(email)}$`, 'i'), ...notDeleted }).lean(),
    Student.findOne({ enrollmentNumber, ...notDeleted }).lean(),
  ]);
  if (emailTaken) throw new ApiError(409, 'An account with this email is already registered.');
  if (enrollTaken) throw new ApiError(409, 'An account with this enrollment number already exists.');

  // Institute + department must be a valid pair from the Admin-owned master
  // data. They are LOCKED after signup (only an Admin can change them later).
  const instituteCode = String(payload.institute).trim();
  const deptName = String(payload.department).trim();
  const institute = await Institute.findOne({ code: instituteCode }).lean();
  if (!institute) throw new ApiError(400, 'Please select a valid institute.');
  const deptOk = (institute.departments || []).some((d) => d && d.name === deptName);
  if (!deptOk) throw new ApiError(400, 'Selected department does not belong to the selected institute.');

  const now = new Date().toISOString();
  const passwordHash = await hashPassword(String(payload.password));
  const verifyToken = mintToken(VERIFY_TOKEN_TTL_MS);
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
    institute: instituteCode,
    department: deptName,
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
    // The address is not proven yet. Login is gated on this, not on `status`,
    // so the Admin portal's activation semantics stay untouched.
    emailVerified: false,
    verifyTokenHash: verifyToken.hash,
    verifyTokenExpiresAt: verifyToken.expiresAt,
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

  // Fire-and-forget verification email. Best-effort: never awaited, never
  // throws, so a mail failure can never block or roll back the registration —
  // the account simply stays unverified and the link can be resent.
  void sendTemplateEmail({
    to: email,
    toName: fullName,
    template: 'welcome',
    data: {
      name: fullName,
      email,
      enrollmentNumber,
      department: payload.department,
      verifyUrl: verifyLink(verifyToken.raw),
      expiresInHours: Math.round(VERIFY_TOKEN_TTL_MS / 3600000),
    },
  }).catch(() => {});

  return toProfile(user, student);
}

/** Student login by enrollment number + password. */
async function login(identifier, password) {
  if (!identifier || !password) {
    throw new ApiError(400, 'Enrollment number or email and password are required.');
  }
  const id = String(identifier).trim();
  const isEmailId = id.includes('@');

  let student = null;
  let user = null;

  if (isEmailId) {
    // Email login (college mail id). Match on either the user or student doc.
    const rx = new RegExp(`^${escapeRegex(id)}$`, 'i');
    // Prefer live rows throughout: a deleted account keeps both its user and
    // student rows, so an address or enrollment number reused after a delete
    // matches two. Without this the deleted one can win and the replacement
    // account is refused at login.
    user = await User.findOne({ role: 'student', email: rx, isDeleted: { $ne: true } }).lean();
    student = await Student.findOne(
      user
        ? { $or: [{ id: user.studentId }, { userId: user.id }, { email: rx }], isDeleted: { $ne: true } }
        : { email: rx, isDeleted: { $ne: true } },
    ).lean();
    if (student && !user) {
      user = await User.findOne({
        role: 'student',
        $or: [{ id: student.userId }, { studentId: student.id }],
        isDeleted: { $ne: true },
      }).lean();
    }
  } else {
    // Enrollment-number login.
    student = await Student.findOne({ enrollmentNumber: id, isDeleted: { $ne: true } }).lean();
    user = student
      ? await User.findOne({
          role: 'student',
          $or: [{ id: student.userId }, { studentId: student.id }],
          isDeleted: { $ne: true },
        }).lean()
      : null;
  }

  // Uniform error to avoid leaking which field was wrong.
  if (!student || !user || user.isDeleted) {
    throw new ApiError(401, 'Invalid credentials.');
  }

  // Email ownership must be proven before the account is usable. Only an
  // explicit `false` blocks: accounts that predate verification have no field
  // and stay usable.
  if (user.emailVerified === false) {
    throw new ApiError(403, 'Verify your college email before signing in. Check your inbox for the link.');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'Your account has been deactivated. Please contact administration.');
  }
  const ok = await comparePassword(String(password), user.passwordHash);
  if (!ok) throw new ApiError(401, 'Invalid credentials.');

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

  // The hit path no longer runs bcrypt, so the two-orders-of-magnitude gap that
  // defeated the deliberately generic response is gone — a miss and a hit now
  // differ by one indexed update rather than a ~300ms hash. That is a large
  // reduction, not a constant-time guarantee: closing the residual gap would
  // need an explicit timing floor on both branches.
  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');

  if (!user || user.isDeleted || user.status !== 'active') return;

  const student = await Student.findOne({
    $or: [{ id: user.studentId }, { userId: user.id }],
  }).lean();
  const displayName = student?.studentName || student?.name || user.name;

  // Store only the HASH of the token, with a short expiry. The credential is
  // NOT changed here: an unauthenticated request must never be able to alter a
  // password, which previously let anyone lock out any student whose address
  // they knew.
  await User.updateOne(
    { id: user.id },
    {
      $set: {
        resetTokenHash: tokenHash,
        resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }
  );

  const base = env.loginUrl || env.frontendOrigin;
  const resetUrl = `${String(base).replace(/\/+$/, '')}/reset-password?token=${raw}`;

  void sendTemplateEmail({
    to: normalizedEmail,
    toName: displayName,
    template: 'password_reset',
    data: {
      name: displayName,
      email: normalizedEmail,
      enrollmentNumber: student?.enrollmentNumber,
      resetUrl,
      expiresInMinutes: Math.round(RESET_TOKEN_TTL_MS / 60000),
    },
  }).catch(() => {});
}

/**
 * Consume a reset token and set the new password.
 *
 * Single-use and time-bound: the token fields are cleared in the same update
 * that writes the new hash, so a replayed link fails. The token is matched by
 * HASH, so a database read does not yield a usable credential.
 */
async function resetPassword(token, newPassword) {
  const raw = String(token || '').trim();
  const password = String(newPassword || '');
  if (!raw) throw new ApiError(400, 'This reset link is invalid.');
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new ApiError(400, 'Password must be at least 8 characters and include a letter and a number.');
  }

  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const user = await User.findOne({ resetTokenHash: tokenHash, role: 'student' }).lean();
  if (!user || user.isDeleted || user.status !== 'active') {
    throw new ApiError(400, 'This reset link is invalid or has already been used.');
  }
  if (!user.resetTokenExpiresAt || new Date(user.resetTokenExpiresAt).getTime() < Date.now()) {
    throw new ApiError(400, 'This reset link has expired. Request a new one.');
  }

  const passwordHash = await hashPassword(password);
  await User.updateOne(
    { id: user.id },
    {
      $set: { passwordHash, updatedAt: new Date().toISOString() },
      $unset: { resetTokenHash: '', resetTokenExpiresAt: '' },
    }
  );
}

/** Absolute URL the student clicks to prove they own the address. */
function verifyLink(raw) {
  const base = String(env.loginUrl || env.frontendOrigin || '').replace(/\/+$/, '');
  return `${base}/verify-email?token=${raw}`;
}

/**
 * Consume a verification token.
 *
 * Single-use and time-bound: the token fields are cleared in the same update
 * that flips `emailVerified`, so a replayed link fails. Matched by HASH, so a
 * database read never yields a usable link.
 */
async function verifyEmail(token) {
  const raw = String(token || '').trim();
  if (!raw) throw new ApiError(400, 'This verification link is invalid.');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  const user = await User.findOne({ verifyTokenHash: hash, role: 'student' }).lean();
  if (!user || user.isDeleted) {
    throw new ApiError(400, 'This verification link is invalid or has already been used.');
  }
  if (!user.verifyTokenExpiresAt || new Date(user.verifyTokenExpiresAt).getTime() < Date.now()) {
    throw new ApiError(400, 'This verification link has expired. Request a new one.');
  }

  await User.updateOne(
    { id: user.id },
    {
      $set: { emailVerified: true, updatedAt: new Date().toISOString() },
      $unset: { verifyTokenHash: '', verifyTokenExpiresAt: '' },
    }
  );
}

/**
 * Re-send the verification link. Silent for unknown or already-verified
 * accounts so this cannot be used to discover which addresses are registered.
 */
async function resendVerification(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!isEmail(normalized)) throw new ApiError(400, 'Enter a valid email address.');

  const user = await User.findOne({ email: normalized, role: 'student' }).lean();
  if (!user || user.isDeleted || user.emailVerified !== false) return;

  const t = mintToken(VERIFY_TOKEN_TTL_MS);
  await User.updateOne(
    { id: user.id },
    { $set: { verifyTokenHash: t.hash, verifyTokenExpiresAt: t.expiresAt, updatedAt: new Date().toISOString() } }
  );

  const student = await Student.findOne({ $or: [{ id: user.studentId }, { userId: user.id }] }).lean();
  void sendTemplateEmail({
    to: normalized,
    toName: student?.studentName || user.name,
    template: 'welcome',
    data: {
      name: student?.studentName || user.name,
      email: normalized,
      enrollmentNumber: student?.enrollmentNumber,
      department: student?.department,
      verifyUrl: verifyLink(t.raw),
      expiresInHours: Math.round(VERIFY_TOKEN_TTL_MS / 3600000),
    },
  }).catch(() => {});
}

module.exports = { register, login, getProfile, changePassword, forgotPassword, resetPassword, toProfile, verifyEmail, resendVerification };
