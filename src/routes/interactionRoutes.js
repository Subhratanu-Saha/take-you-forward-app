const express = require('express');
const router = express.Router();
const interactionController = require('../controllers/interactionController');

const {
  validateCreateInteraction,
  validateUpdateInteraction,
} = require('../middleware/interactionValidator');

/**
 * @swagger
 * /api/v1/interactions/{interactionId}:
 *   get:
 *     summary: Get a specific interaction by ID
 *     description: Retrieve detailed information about a specific interaction record using its unique ID
 *     tags:
 *       - Interactions
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: path
 *         name: interactionId
 *         required: true
 *         schema:
 *           type: string
 *         example: INT-1750000000000-ABC123
 *         description: Unique interaction identifier
 *     responses:
 *       200:
 *         description: Interaction retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Interaction'
 *       400:
 *         description: Invalid interaction ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Interaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerErrorResponse'
 */
// GET interaction by ID [/api/v1/interactions/:interactionId]
router.get('/:interactionId', interactionController.getInteractionRecord);

/**
 * @swagger
 * /api/v1/interactions:
 *   post:
 *     summary: Create a new interaction record
 *     description: |
 *       Create a new customer interaction with the following validation rules:
 *       - **interactionmode**: Must be `SIGNUP`
 *       - **interactiontype**: Must be `SYSTEM`
 *       - **interactionvalue**: Must be `ACCOUNT_CREATION`
 *       - **customerid**: Must be a valid existing customer ID
 *     tags:
 *       - Interactions
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerid
 *               - interactionmode
 *               - interactiontype
 *               - interactionvalue
 *             properties:
 *               customerid:
 *                 type: string
 *                 example: CUST-1750000000000-ABC123
 *                 description: Valid customer ID
 *               interactionmode:
 *                 type: string
 *                 enum: [SIGNUP]
 *                 example: SIGNUP
 *                 description: Channel of interaction
 *               interactiontype:
 *                 type: string
 *                 enum: [SYSTEM]
 *                 example: SYSTEM
 *                 description: Type of interaction
 *               interactionvalue:
 *                 type: string
 *                 enum: [ACCOUNT_CREATION]
 *                 example: ACCOUNT_CREATION
 *                 description: Interaction event value
 *     responses:
 *       201:
 *         description: Interaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Interaction'
 *       400:
 *         description: Validation error - invalid mode, type, value, or customer ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerErrorResponse'
 */
// CREATE new interaction [/api/v1/interactions]
router.post('/', validateCreateInteraction, interactionController.createInteractionRecord);

/**
 * @swagger
 * /api/v1/interactions/{interactionId}:
 *   put:
 *     summary: Update an existing interaction record
 *     description: |
 *       Update an interaction with the following validation rules:
 *       - **interactionmode**: Must be `SIGNUP` (if provided)
 *       - **interactiontype**: Must be `SYSTEM` (if provided)
 *       - **interactionvalue**: Must be `ACCOUNT_CREATION` (if provided)
 *     tags:
 *       - Interactions
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: path
 *         name: interactionId
 *         required: true
 *         schema:
 *           type: string
 *         example: INT-1750000000000-ABC123
 *         description: Unique interaction identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               interactionmode:
 *                 type: string
 *                 enum: [SIGNUP]
 *                 example: SIGNUP
 *                 description: Channel of interaction
 *               interactiontype:
 *                 type: string
 *                 enum: [SYSTEM]
 *                 example: SYSTEM
 *                 description: Type of interaction
 *               interactionvalue:
 *                 type: string
 *                 enum: [ACCOUNT_CREATION]
 *                 example: ACCOUNT_CREATION
 *                 description: Interaction event value
 *     responses:
 *       200:
 *         description: Interaction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Interaction'
 *       400:
 *         description: Validation error - invalid mode, type, or value
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Interaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerErrorResponse'
 */
// UPDATE interaction [/api/v1/interactions/:interactionId]
router.put('/:interactionId', validateUpdateInteraction, interactionController.updateInteractionRecord);

module.exports = router;