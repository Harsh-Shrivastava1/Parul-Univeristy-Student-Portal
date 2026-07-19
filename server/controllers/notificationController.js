const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const Notification = require('../models/Notification');
const { loadIdentity, studentKeys } = require('../utils/identity');

/** Match a notification addressed to this student (recipient scope). */
function recipientFilter(user, student) {
  const keys = studentKeys(user, student);
  const or = [
    { recipientId: { $in: keys } },
    { userId: { $in: keys } },
    { studentId: { $in: keys } },
  ];
  const enrollment = student && student.enrollmentNumber;
  if (enrollment) or.push({ enrollmentNumber: enrollment });
  return { $or: or };
}

// PATCH /api/notifications/:id/read
const markRead = asyncHandler(async (req, res) => {
  const identity = await loadIdentity(req.user.sub);
  if (!identity) throw new ApiError(404, 'Account not found.');
  await Notification.updateOne(
    { id: req.params.id, ...recipientFilter(identity.user, identity.student) },
    { $set: { read: true } }
  );
  res.json({ success: true });
});

// PATCH /api/notifications/read-all
const markAllRead = asyncHandler(async (req, res) => {
  const identity = await loadIdentity(req.user.sub);
  if (!identity) throw new ApiError(404, 'Account not found.');
  await Notification.updateMany(recipientFilter(identity.user, identity.student), { $set: { read: true } });
  res.json({ success: true });
});

// DELETE /api/notifications/:id  — recipient removes their own notification
const remove = asyncHandler(async (req, res) => {
  const identity = await loadIdentity(req.user.sub);
  if (!identity) throw new ApiError(404, 'Account not found.');
  await Notification.deleteOne({ id: req.params.id, ...recipientFilter(identity.user, identity.student) });
  res.json({ success: true });
});

module.exports = { markRead, markAllRead, remove };
