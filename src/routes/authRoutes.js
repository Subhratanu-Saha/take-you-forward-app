const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, requireRole, validateLoginInput, validateRegisterInput } = require('../middleware');

router.post('/login', validateLoginInput, authController.login);
router.post('/register', requireAuth, requireRole('SUPER_ADMIN'), validateRegisterInput, authController.register);
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
