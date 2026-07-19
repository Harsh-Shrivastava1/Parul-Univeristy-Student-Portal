const { Router } = require('express');
const authRoutes = require('./authRoutes');
const departmentRoutes = require('./departmentRoutes');
const meRoutes = require('./meRoutes');
const advertisementRoutes = require('./advertisementRoutes');
const applicationRoutes = require('./applicationRoutes');
const notificationRoutes = require('./notificationRoutes');

const router = Router();

// Owned by the Student Portal backend
router.use('/auth', authRoutes);
router.use('/me', meRoutes);

// Read-only over shared collections owned by sibling portals
// (Admin: departments · TEC: advertisements/applications).
router.use('/departments', departmentRoutes);
router.use('/advertisements', advertisementRoutes);
router.use('/applications', applicationRoutes);

// Shared single-model collection (recipient-scoped writes)
router.use('/notifications', notificationRoutes);

// DEV-ONLY email diagnostics (SMTP + template rendering). Never in production.
if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line global-require
  const testRoutes = require('./testRoutes');
  router.use('/test', testRoutes);
}

module.exports = router;
