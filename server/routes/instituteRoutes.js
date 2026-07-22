const { Router } = require('express');
const instituteController = require('../controllers/instituteController');

const router = Router();

// Public — read-only (Admin-owned master data), used by the signup form.
router.get('/', instituteController.listInstitutes);

module.exports = router;
