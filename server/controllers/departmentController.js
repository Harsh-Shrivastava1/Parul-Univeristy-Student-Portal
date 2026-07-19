const asyncHandler = require('../utils/asyncHandler');
const Department = require('../models/Department');

/**
 * Bootstrap fallback used only when the Admin-owned departments collection
 * has not been seeded yet, so the registration dropdown is never empty in dev.
 * Once Admin creates departments, the live list takes over automatically.
 */
const FALLBACK_DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics & Communication',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Computer Applications',
  'Business Administration',
  'Data Science',
].map((name, i) => ({ id: `DEP-FALLBACK-${i + 1}`, name }));

// GET /api/departments  (public) — read-only list for the registration dropdown
const listDepartments = asyncHandler(async (_req, res) => {
  const docs = await Department.find({
    isDeleted: { $ne: true },
    status: { $ne: 'archived' },
  }).lean();

  const live = docs
    .filter((d) => d && d.name)
    .map((d) => ({ id: d.id || String(d.name), name: d.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  res.json({ success: true, data: live.length ? live : FALLBACK_DEPARTMENTS });
});

module.exports = { listDepartments };
