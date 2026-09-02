const express = require('express');
const router = express.Router();
const loyaltyController = require('../controllers/loyaltyController');
const { validateCustomerId } = require('../middleware/customerValidator');

/**
 * @swagger
 * /api/v1/loyalty/{customerid}:
 *   get:
 *     summary: Get customer loyalty details
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
 *       404:
 *         description: Loyalty record not found
 */

// GET /api/v1/loyalty/:customerId
router.get('/:customerId', validateCustomerId, loyaltyController.getLoyaltySummary);

// CREATE initial loyalty record or ensure loyalty exists [/api/v1/loyalty/:customerId]
router.post('/:customerId', validateCustomerId, loyaltyController.createLoyaltyRecord);

/**
 * @swagger
 * /api/v1/loyalty/{customerid}:
 *   put:
 *     summary: Update customer loyalty points and tier
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
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
// UPDATE loyalty tier [/api/v1/loyalty/:customerId]
router.put('/:customerId', validateCustomerId, loyaltyController.updateLoyaltyTier);

module.exports = router;