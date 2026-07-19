const User = require('../models/User');
const Student = require('../models/Student');

/** Loads the authenticated student's user + student documents. */
async function loadIdentity(userId) {
  const user = await User.findOne({ id: userId, role: 'student' }).lean();
  if (!user) return null;
  const student = await Student.findOne({
    $or: [{ id: user.studentId }, { userId: user.id }],
  }).lean();
  return { user, student };
}

/** All id strings that a shared document might use to reference this student. */
function studentKeys(user, student) {
  const keys = new Set();
  [
    user && user.id,
    user && user.studentId,
    student && student.id,
    student && student.studentId,
  ].forEach((k) => {
    if (k) keys.add(k);
  });
  return Array.from(keys);
}

/** Mongo $or matching any shared reference to this student. */
function studentMatch(user, student) {
  const keys = studentKeys(user, student);
  const or = [{ studentId: { $in: keys } }, { userId: { $in: keys } }];
  const enrollment = student && student.enrollmentNumber;
  if (enrollment) or.push({ enrollmentNumber: enrollment });
  return { $or: or };
}

module.exports = { loadIdentity, studentKeys, studentMatch };
