const { Router } = require('express');
const authController = require('../controllers/authController');
const { requireAuth, requireStudent } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = Router();

// Public (rate-limited)
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/refresh', authController.refresh);

// Authenticated student
router.get('/me', requireAuth, requireStudent, authController.me);
router.post('/logout', requireAuth, authController.logout);
router.post('/change-password', authLimiter, requireAuth, requireStudent, authController.changePassword);

module.exports = router;
