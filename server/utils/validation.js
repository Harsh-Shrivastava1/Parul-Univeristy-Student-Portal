const ApiError = require('./ApiError');

const MAX = {
  name: 120,
  email: 160,
  address: 300,
  url: 300,
  phone: 20,
  emergency: 120,
  skill: 40,
  skillsCount: 30,
  password: 200,
};

const trim = (v) => (typeof v === 'string' ? v.trim() : v);
const normalizeEmail = (v) => String(v || '').trim().toLowerCase();

function ensureMax(v, max, label) {
  if (typeof v === 'string' && v.length > max) {
    throw new ApiError(400, `${label} must be at most ${max} characters.`);
  }
  return v;
}

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isUrl = (v) => !v || (/^https?:\/\/[^\s]+$/i.test(v) && v.length <= MAX.url);
const isPhone = (v) => !v || /^[+]?[0-9][0-9\s-]{6,19}$/.test(v);

/**
 * Validate + sanitize the student-editable personal profile fields. Returns a
 * clean object keyed by the client field names; unknown/immutable fields are
 * ignored (the backend is the source of truth).
 */
function validateProfilePatch(body) {
  const b = body || {};
  const out = {};

  if (b.contact !== undefined) {
    const c = trim(b.contact);
    if (c && !isPhone(c)) throw new ApiError(400, 'Enter a valid phone number.');
    out.contact = ensureMax(c, MAX.phone, 'Phone');
  }
  if (b.email !== undefined) {
    const e = normalizeEmail(b.email);
    if (e && !isEmail(e)) throw new ApiError(400, 'Enter a valid email address.');
    out.email = ensureMax(e, MAX.email, 'Email');
  }
  if (b.address !== undefined) out.address = ensureMax(trim(b.address), MAX.address, 'Address');
  if (b.linkedIn !== undefined) {
    const u = trim(b.linkedIn);
    if (!isUrl(u)) throw new ApiError(400, 'LinkedIn must be a valid URL.');
    out.linkedIn = u;
  }
  if (b.portfolio !== undefined) {
    const u = trim(b.portfolio);
    if (!isUrl(u)) throw new ApiError(400, 'Portfolio must be a valid URL.');
    out.portfolio = u;
  }
  if (b.emergencyContact !== undefined) {
    out.emergencyContact = ensureMax(trim(b.emergencyContact), MAX.emergency, 'Emergency contact');
  }
  if (b.skills !== undefined) {
    const raw = Array.isArray(b.skills) ? b.skills : [];
    if (raw.length > MAX.skillsCount) throw new ApiError(400, `You can list at most ${MAX.skillsCount} skills.`);
    out.skills = raw.map((s) => ensureMax(trim(String(s)), MAX.skill, 'Skill')).filter(Boolean);
  }

  // --- Academic + personal details (synced from the application form) ---------
  if (b.cgpa !== undefined) {
    const n = Number(b.cgpa);
    if (isNaN(n) || n < 0 || n > 10) throw new ApiError(400, 'CGPA must be between 0 and 10.');
    out.cgpa = n;
  }
  if (b.backlogs !== undefined) {
    const n = Number(b.backlogs);
    if (isNaN(n) || n < 0) throw new ApiError(400, 'Backlogs cannot be negative.');
    out.backlogs = Math.floor(n);
  }
  if (b.attendance !== undefined) {
    const n = Number(b.attendance);
    if (isNaN(n) || n < 0 || n > 100) throw new ApiError(400, 'Attendance must be between 0 and 100.');
    out.attendance = n;
  }
  if (b.fatherName !== undefined) out.fatherName = ensureMax(trim(b.fatherName), MAX.name, "Father's name");
  if (b.motherName !== undefined) out.motherName = ensureMax(trim(b.motherName), MAX.name, "Mother's name");
  if (b.dateOfBirth !== undefined) out.dateOfBirth = ensureMax(trim(b.dateOfBirth), 40, 'Date of birth');
  if (b.gender !== undefined) out.gender = ensureMax(trim(b.gender), 20, 'Gender');
  if (b.languages !== undefined) {
    const raw = Array.isArray(b.languages)
      ? b.languages
      : String(b.languages || '').split(',');
    out.languages = raw
      .map((l) => ensureMax(trim(String(l)), MAX.skill, 'Language'))
      .filter(Boolean)
      .slice(0, 20);
  }
  if (b.spiScores !== undefined && b.spiScores && typeof b.spiScores === 'object') {
    const sp = {};
    for (let i = 1; i <= 8; i++) {
      const v = b.spiScores[`sem${i}`];
      if (v === undefined || v === null || v === '') continue;
      const n = Number(v);
      if (isNaN(n) || n < 0 || n > 10) throw new ApiError(400, `SPI for Sem ${i} must be between 0 and 10.`);
      sp[`sem${i}`] = n;
    }
    out.spiScores = sp;
  }
  return out;
}

module.exports = { MAX, trim, normalizeEmail, ensureMax, isEmail, isUrl, isPhone, validateProfilePatch };
