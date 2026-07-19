const { Router } = require('express');
const meController = require('../controllers/meController');
const { requireAuth, requireStudent } = require('../middleware/auth');

const router = Router();

// All /api/me/* routes require an authenticated student.
router.use(requireAuth, requireStudent);

router.get('/profile', meController.getProfile);
router.patch('/profile', meController.updateProfile);
router.get('/applications', meController.listApplications);
router.get('/training', meController.getTraining);
router.get('/notifications', meController.listNotifications);
router.get('/documents', meController.listDocuments);

module.exports = router;
