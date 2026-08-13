const { Router } = require('express');
const applicationController = require('../controllers/applicationController');
const { requireAuth, requireStudent } = require('../middleware/auth');

const router = Router();

// READ-ONLY. The applications collection is owned by the TEC backend, which
// serves the student-authenticated create (POST) and withdraw (DELETE).
router.get('/:id', requireAuth, requireStudent, applicationController.getOne);
router.post('/', requireAuth, requireStudent, applicationController.create);
router.delete('/:id', requireAuth, requireStudent, applicationController.remove);

module.exports = router;
