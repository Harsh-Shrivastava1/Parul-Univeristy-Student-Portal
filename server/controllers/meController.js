const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Student = require('../models/Student');
const Application = require('../models/Application');
const Advertisement = require('../models/Advertisement');
const Training = require('../models/Training');
const Notification = require('../models/Notification');
const authService = require('../services/authService');
const { recordAudit } = require('../services/auditService');
const { validateProfilePatch } = require('../utils/validation');
const { clientIp } = require('../utils/http');
const { loadIdentity, studentKeys, studentMatch } = require('../utils/identity');
const { toApplication, toTraining, toNotification } = require('../utils/mappers');

// Personal fields the student is allowed to edit. Enrollment / department /
// semester / academic data are intentionally excluded (immutable / not owned).
const EDITABLE = {
  contact: 'contactNumber',
  email: 'email',
  address: 'address',
  skills: 'skills',
  linkedIn: 'linkedIn',
  portfolio: 'portfolio',
  emergencyContact: 'emergencyContact',
  // Academic + personal details, synced from the application form so SPI and the
  // rest persist on the profile and pre-fill future applications. Enrollment /
  // department / semester remain immutable and are intentionally excluded.
  cgpa: 'cgpa',
  fatherName: 'fatherName',
  motherName: 'motherName',
  dateOfBirth: 'dateOfBirth',
  gender: 'gender',
  languages: 'languages',
  backlogs: 'backlogs',
  attendance: 'attendance',
  spiScores: 'spiScores',
};

// GET /api/me/profile
const getProfile = asyncHandler(async (req, res) => {
  const profile = await authService.getProfile(req.user.sub);
  res.json({ success: true, data: profile });
});

// PATCH /api/me/profile — personal fields only (validated + sanitized)
const updateProfile = asyncHandler(async (req, res) => {
  const identity = await loadIdentity(req.user.sub);
  if (!identity || !identity.student) throw new ApiError(404, 'Student profile not found.');

  const clean = validateProfilePatch(req.body || {});
  const $set = { updatedAt: new Date().toISOString() };
  for (const [clientKey, dbKey] of Object.entries(EDITABLE)) {
    if (clean[clientKey] !== undefined) $set[dbKey] = clean[clientKey];
  }

  await Student.updateOne({ id: identity.student.id }, { $set });
  await recordAudit({
    action: 'PROFILE_UPDATED',
    userId: identity.user.id,
    userName: identity.user.name,
    entity: 'student',
    entityId: identity.student.id,
    ip: clientIp(req),
    meta: { fields: Object.keys($set).filter((k) => k !== 'updatedAt') },
  });
  const profile = await authService.getProfile(req.user.sub);
  res.json({ success: true, data: profile });
});

// GET /api/me/applications
const listApplications = asyncHandler(async (req, res) => {
  const identity = await loadIdentity(req.user.sub);
  if (!identity) throw new ApiError(404, 'Account not found.');

  const apps = await Application.find(studentMatch(identity.user, identity.student)).lean();
  const adIds = [...new Set(apps.map((a) => a.advertisementId).filter(Boolean))];
  const ads = adIds.length ? await Advertisement.find({ id: { $in: adIds } }).lean() : [];
  const adById = new Map(ads.map((a) => [a.id, a]));

  const data = apps
    .map((a) => toApplication(a, adById.get(a.advertisementId)))
    .sort((a, b) => new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime());
  res.json({ success: true, data });
});

// GET /api/me/training  (Coordinator-owned, read-only)
const getTraining = asyncHandler(async (req, res) => {
  const identity = await loadIdentity(req.user.sub);
  if (!identity) throw new ApiError(404, 'Account not found.');

  const keys = studentKeys(identity.user, identity.student);
  const apps = await Application.find(studentMatch(identity.user, identity.student)).lean();
  const appIds = apps.map((a) => a.id).filter(Boolean);

  const training = await Training.findOne({
    $or: [{ studentId: { $in: keys } }, { applicationId: { $in: appIds } }],
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ success: true, data: toTraining(training) });
});

// GET /api/me/notifications
const listNotifications = asyncHandler(async (req, res) => {
  const identity = await loadIdentity(req.user.sub);
  if (!identity) throw new ApiError(404, 'Account not found.');

  const keys = studentKeys(identity.user, identity.student);
  const enrollment = identity.student && identity.student.enrollmentNumber;
  const or = [
    { recipientId: { $in: keys } },
    { userId: { $in: keys } },
    { studentId: { $in: keys } },
  ];
  if (enrollment) or.push({ enrollmentNumber: enrollment });

  const docs = await Notification.find({ $or: or }).lean();
  const data = docs
    .map((n) => toNotification(n, identity.user.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json({ success: true, data });
});

// GET /api/me/documents — references to generated documents (read-only)
const listDocuments = asyncHandler(async (req, res) => {
  const identity = await loadIdentity(req.user.sub);
  if (!identity) throw new ApiError(404, 'Account not found.');

  const apps = await Application.find(studentMatch(identity.user, identity.student)).lean();
  const keys = studentKeys(identity.user, identity.student);
  const training = await Training.findOne({ studentId: { $in: keys } }).lean();

  const documents = [];
  for (const app of apps) {
    const d = app.documents || {};
    const status = String(app.status || app.applicationStatus || '');
    if (d.applicationPdf) documents.push({ type: 'Application PDF', applicationId: app.id, ref: d.applicationPdf });
    // Offer letter is generated on-demand by the TEC backend once the
    // application reaches the right status. Completion certificates are issued
    // PHYSICALLY by the Internship Cell office (college rule) — no digital copy.
    if (d.offerLetter || ['Ready To Join', 'Joined', 'Internship Completed'].includes(status))
      documents.push({ type: 'Offer Letter', applicationId: app.id, ref: d.offerLetter || null });
  }
  if (training && training.attendanceForm) {
    documents.push({ type: 'Attendance Form', trainingId: training.id, ref: training.attendanceForm });
  }

  res.json({ success: true, data: documents });
});

module.exports = {
  getProfile,
  updateProfile,
  listApplications,
  getTraining,
  listNotifications,
  listDocuments,
};
