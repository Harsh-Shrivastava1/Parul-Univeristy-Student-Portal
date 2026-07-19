const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Advertisement = require('../models/Advertisement');
const { toInternship } = require('../utils/mappers');

// Only advertisements visible to students (published, not deleted/archived).
const visibleFilter = {
  isDeleted: { $ne: true },
  status: { $in: ['Published', 'Open'] },
};

// GET /api/advertisements  (TEC-owned, read-only)
const list = asyncHandler(async (req, res) => {
  const docs = await Advertisement.find(visibleFilter).lean();
  let data = docs.map(toInternship).filter(Boolean);

  const q = (req.query.q || '').toString().trim().toLowerCase();
  if (q) {
    data = data.filter(
      (i) =>
        i.postName.toLowerCase().includes(q) ||
        i.department.toLowerCase().includes(q) ||
        (i.skills || []).some((s) => String(s).toLowerCase().includes(q))
    );
  }

  data.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
  res.json({ success: true, data });
});

// GET /api/advertisements/:id  (TEC-owned, read-only)
const getOne = asyncHandler(async (req, res) => {
  const ad = await Advertisement.findOne({ id: req.params.id }).lean();
  if (!ad || ad.isDeleted) throw new ApiError(404, 'Internship not found.');
  res.json({ success: true, data: toInternship(ad) });
});

module.exports = { list, getOne };
