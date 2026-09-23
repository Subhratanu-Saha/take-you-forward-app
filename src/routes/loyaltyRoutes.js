const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
const { validateCustomerId } = require('../middleware/customerValidator');
const { authenticate, authorizeRoles, ROLES } = require('../middleware/authMiddleware');

// Domain Security Guards: All loyalty endpoints require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/v1/loyalty/{customerid}:
 *   get:
 *     summary: Get customer loyalty details
 *     description: "Retrieve loyalty details for a customer. Required roles: SUPER_ADMIN, STORE_MANAGER, SUPPORT_AGENT."
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Loyalty
 *     parameters:
 *       - in: path
 *         name: customerid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Loyalty details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Loyalty'
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
 *       404:
 *         description: Loyalty record not found
 */

// GET /api/v1/loyalty/:customerId
router.get('/:customerId', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.SUPPORT_AGENT), validateCustomerId, loyaltyController.getLoyaltySummary);

/**
 * @swagger
 * /api/v1/loyalty/{customerid}:
 *   post:
 *     summary: Create initial loyalty record
 *     description: "Create initial loyalty record or ensure loyalty exists for customer. Required roles: SUPER_ADMIN, STORE_MANAGER."
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Loyalty
 *     parameters:
 *       - in: path
 *         name: customerid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Loyalty record created or verified
 *       400:
 *         description: Invalid customer ID format
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
// CREATE initial loyalty record or ensure loyalty exists [/api/v1/loyalty/:customerId]
router.post('/:customerId', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER), validateCustomerId, loyaltyController.createLoyaltyRecord);

/**
 * @swagger
 * /api/v1/loyalty/{customerid}:
 *   put:
 *     summary: Update customer loyalty points and tier
 *     description: "Update customer loyalty points and tier. Required roles: SUPER_ADMIN, STORE_MANAGER."
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Loyalty
 *     parameters:
 *       - in: path
 *         name: customerid
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - totalpoints
 *             properties:
 *               totalpoints:
 *                 type: number
 *                 example: 6000
 *     responses:
 *       200:
 *         description: Loyalty points and tier updated successfully
 *       400:
 *         description: Invalid points
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
// UPDATE loyalty tier [/api/v1/loyalty/:customerId]
router.put('/:customerId', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER), validateCustomerId, loyaltyController.updateLoyaltyTier);

module.exports = router;