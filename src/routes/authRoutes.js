const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth, requireRole, validateLoginInput, validateRegisterInput } = require('../middleware');

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user credentials and return a signed JWT token.
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@tayf.test
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful with JWT token returned
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid email or password
 */
router.post('/login', validateLoginInput, authController.login);

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a staff user
 *     description: "Register a new staff user. Required role: SUPER_ADMIN."
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - email
 *               - password
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: Jane
 *               lastname:
 *                 type: string
 *                 example: Doe
 *               username:
 *                 type: string
 *                 example: janedoe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jane@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *               role:
 *                 type: string
 *                 enum: [SUPER_ADMIN, STORE_MANAGER, SUPPORT_AGENT, AUDITOR, MARKETING_USER]
 *                 example: STORE_MANAGER
 *     responses:
 *       201:
 *         description: Staff user registered successfully
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
 */
router.post('/register', requireAuth, requireRole('SUPER_ADMIN'), validateRegisterInput, authController.register);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     description: "Retrieve profile and active role of authenticated user. Required roles: Authenticated user."
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: Authenticated user profile retrieved successfully
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 */
router.get('/me', requireAuth, authController.getMe);

module.exports = router;
