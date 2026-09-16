const { Router } = require('express');
const applicationController = require('../controllers/applicationController');
const { requireAuth, requireStudent } = require('../middleware/auth');

const router = Router();

// READ-ONLY, as stated. The applications collection is owned by the TEC
// backend, which serves the student-authenticated create (POST) and withdraw
// (DELETE) and enforces the rules this portal does not: the advertisement must
// be Published and not deleted, a withdrawal is only allowed while the status
// is still "Applied", the advertisement counter is maintained, and the action
// is audited.
//
// Those write routes used to be mounted here too, directly under this comment.
// Because the SPA retried this endpoint whenever the TEC call threw — including
// on a deliberate 409 — every one of those rules became opt-out from the
// client: a student could apply to a closed advertisement, or hard-delete a
// Joined application and orphan the coordinator's training record.
router.get('/:id', requireAuth, requireStudent, applicationController.getOne);

module.exports = router;
