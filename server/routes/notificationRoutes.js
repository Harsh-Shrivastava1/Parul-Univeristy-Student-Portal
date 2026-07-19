const { Router } = require('express');
const notificationController = require('../controllers/notificationController');
const { requireAuth, requireStudent } = require('../middleware/auth');

const router = Router();

router.use(requireAuth, requireStudent);

router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);
router.delete('/:id', notificationController.remove);

module.exports = router;
