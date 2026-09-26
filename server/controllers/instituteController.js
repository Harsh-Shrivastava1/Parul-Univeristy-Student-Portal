const asyncHandler = require('../utils/asyncHandler');
const Institute = require('../models/Institute');

/**
 * GET /api/institutes  (public) — read-only list for the signup cascading
 * dropdowns: [{ code, departments: [name, ...] }].
 */
const listInstitutes = asyncHandler(async (_req, res) => {
  const docs = await Institute.find({}).lean();
  const data = docs
    .filter((i) => i && i.code)
    .map((i) => ({
      code: i.code,
      departments: (i.departments || []).map((d) => d.name).filter(Boolean).sort(),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
  res.json({ success: true, data });
});

module.exports = { listInstitutes };
