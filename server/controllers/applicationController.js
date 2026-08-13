const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Application = require('../models/Application');
const Advertisement = require('../models/Advertisement');
const { loadIdentity, studentMatch } = require('../utils/identity');
const { toApplication } = require('../utils/mappers');

/**
 * Read-only application access for the Student Portal.
 *
 * WRITES (create/withdraw) are NOT served here — the `applications` collection
 * is owned by the TEC Cell backend, which exposes the student-authenticated
 * POST /applications and DELETE /applications/:id. The Student Portal frontend
 * targets the TEC API (VITE_TEC_API_URL) for those writes and never mutates the
 * collection itself.
 */

// GET /api/applications/:id — own application (read-only)
const getOne = asyncHandler(async (req, res) => {
  const identity = await loadIdentity(req.user.sub);
  if (!identity) throw new ApiError(404, 'Account not found.');

  const app = await Application.findOne({
    id: req.params.id,
    ...studentMatch(identity.user, identity.student),
  }).lean();
  if (!app) throw new ApiError(404, 'Application not found.');

  const ad = app.advertisementId
    ? await Advertisement.findOne({ id: app.advertisementId }).lean()
    : null;
  res.json({ success: true, data: toApplication(app, ad) });
});

// POST /api/applications — submit application
const create = asyncHandler(async (req, res) => {
  const identity = await loadIdentity(req.user.sub);
  if (!identity) throw new ApiError(404, 'Account not found.');

  const { advertisementId, formData } = req.body || {};
  if (!advertisementId || !formData) {
    throw new ApiError(400, 'advertisementId and formData are required.');
  }

  const ad = await Advertisement.findOne({ id: advertisementId }).lean();
  if (!ad) throw new ApiError(404, 'Internship posting not found.');

  // Check duplicate
  const existing = await Application.findOne({
    advertisementId,
    ...studentMatch(identity.user, identity.student),
  }).lean();

  if (existing) {
    throw new ApiError(400, 'You have already submitted an application for this internship.');
  }

  const appId = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newDoc = await Application.create({
    id: appId,
    advertisementId,
    advertisementTitle: ad.title || ad.internshipTitle || ad.postName || '',
    studentId: identity.student ? identity.student.id : identity.user.id,
    userId: identity.user.id,
    studentName: identity.user.name,
    enrollmentNumber: identity.student ? identity.student.enrollmentNumber : formData.enrollmentNumber,
    department: identity.student ? identity.student.department : formData.departmentName,
    appliedDate: now,
    lastUpdated: now,
    status: 'Applied',
    applicationStatus: 'Applied',
    formData,
    timeline: [
      {
        status: 'Applied',
        at: now,
        timestamp: now,
        notes: 'Application submitted successfully.',
      },
    ],
  });

  res.json({ success: true, data: toApplication(newDoc.toObject(), ad) });
});

// DELETE /api/applications/:id — withdraw application
const remove = asyncHandler(async (req, res) => {
  const identity = await loadIdentity(req.user.sub);
  if (!identity) throw new ApiError(404, 'Account not found.');

  const app = await Application.findOne({
    id: req.params.id,
    ...studentMatch(identity.user, identity.student),
  });

  if (!app) throw new ApiError(404, 'Application not found.');

  await Application.deleteOne({ id: req.params.id });
  res.json({ success: true, message: 'Application withdrawn successfully.' });
});

module.exports = { getOne, create, remove };

