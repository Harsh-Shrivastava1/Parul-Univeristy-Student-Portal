const { Router } = require('express');
const advertisementController = require('../controllers/advertisementController');
const { requireAuth, requireStudent } = require('../middleware/auth');

const router = Router();

// Read-only (TEC-owned data). Student-authenticated.
router.get('/', requireAuth, requireStudent, advertisementController.list);
router.get('/:id', requireAuth, requireStudent, advertisementController.getOne);

module.exports = router;
