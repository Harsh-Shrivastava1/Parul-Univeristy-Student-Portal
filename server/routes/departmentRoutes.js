const { Router } = require('express');
const departmentController = require('../controllers/departmentController');

const router = Router();

// Public — read-only (owned by Admin Portal)
router.get('/', departmentController.listDepartments);

module.exports = router;
