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
  return out;
}

module.exports = { MAX, trim, normalizeEmail, ensureMax, isEmail, isUrl, isPhone, validateProfilePatch };
