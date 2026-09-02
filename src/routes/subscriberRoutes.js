const express = require('express');
const router = express.Router();
const subscriberController = require('../controllers/subscriberController');
const {
  validateCreateSubscriber,
  validateUpdateSubscriber,
  validateGetSubscriberById,
  validateGetSubscriberByCustomerId,
} = require('../middleware/subscriberValidator');

/**
 * @swagger
 * /api/v1/subscriber:
 *   get:
 *     summary: Get subscriber by customer ID
 *     description: Retrieve a subscriber record using the customer ID query parameter
 *     tags:
 *       - Subscribers
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: query
 *         name: customerid
 *         required: true
 *         schema:
 *           type: string
 *         example: CUST-1750000000000-ABC123
 *         description: The customer ID to look up
 *     responses:
 *       200:
 *         description: Subscriber retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Invalid or missing customer ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Subscriber not found for the given customer ID
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
// GET subscriber by customer ID [/api/v1/subscriber?customerid=X]
router.get('/', validateGetSubscriberByCustomerId, subscriberController.getSubscriberByCustomerId);

/**
 * @swagger
 * /api/v1/subscriber/{subscriberId}:
 *   get:
 *     summary: Get a specific subscriber by ID
 *     description: Retrieve detailed information about a specific subscriber record using its unique ID
 *     tags:
 *       - Subscribers
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: path
 *         name: subscriberId
 *         required: true
 *         schema:
 *           type: string
 *         example: SUB-1750000000000-ABC123
 *         description: Unique subscriber identifier
 *     responses:
 *       200:
 *         description: Subscriber retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Invalid subscriber ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Subscriber not found
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
// GET subscriber by ID [/api/v1/subscriber/:subscriberId]
router.get('/:subscriberId', validateGetSubscriberById, subscriberController.getSubscriberRecord);

/**
 * @swagger
 * /api/v1/subscriber:
 *   post:
 *     summary: Create a new subscriber record
 *     description: |
 *       Create a new subscriber with opt-in preferences for newsletters and SMS.
 *       Validation rules:
 *       - **customerid**: Must be a valid existing customer ID
 *       - **issubscribe**: Boolean subscription flag
 *       - **emailpermstatus**: Boolean email permission flag
 *       - **smspermstatus**: Boolean SMS permission flag
 *     tags:
 *       - Subscribers
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerid
 *               - issubscribe
 *               - emailpermstatus
 *               - smspermstatus
 *             properties:
 *               customerid:
 *                 type: string
 *                 example: CUST-1750000000000-ABC123
 *                 description: Valid customer ID
 *               issubscribe:
 *                 type: boolean
 *                 example: true
 *                 description: Subscription status
 *               emailpermstatus:
 *                 type: boolean
 *                 example: true
 *                 description: Email permission status
 *               smspermstatus:
 *                 type: boolean
 *                 example: false
 *                 description: SMS permission status
 *     responses:
 *       201:
 *         description: Subscriber created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Validation error - invalid email, phone, or customer ID
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
// CREATE new subscriber [/api/v1/subscriber]
router.post('/', validateCreateSubscriber, subscriberController.createSubscriberRecord);

/**
 * @swagger
 * /api/v1/subscriber/{subscriberId}:
 *   put:
 *     summary: Update an existing subscriber record
 *     description: |
 *       Update a subscriber's opt-in preferences or contact details.
 *       Validation rules:
 *       - **issubscribe**: Boolean subscription flag (if provided)
 *       - **emailpermstatus**: Boolean email permission flag (if provided)
 *       - **smspermstatus**: Boolean SMS permission flag (if provided)
 *     tags:
 *       - Subscribers
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: path
 *         name: subscriberId
 *         required: true
 *         schema:
 *           type: string
 *         example: SUB-1750000000000-ABC123
 *         description: Unique subscriber identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               issubscribe:
 *                 type: boolean
 *                 example: false
 *                 description: Subscription status
 *               emailpermstatus:
 *                 type: boolean
 *                 example: true
 *                 description: Email permission status
 *               smspermstatus:
 *                 type: boolean
 *                 example: true
 *                 description: SMS permission status
 *     responses:
 *       200:
 *         description: Subscriber updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Subscriber'
 *       400:
 *         description: Validation error - invalid email or phone format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       404:
 *         description: Subscriber not found
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
// UPDATE subscriber [/api/v1/subscriber/:subscriberId]
router.put('/:subscriberId', validateUpdateSubscriber, subscriberController.updateSubscriberRecord);

/**
 * @swagger
 * /api/v1/subscriber/{subscriberId}:
 *   delete:
 *     summary: Delete a subscriber record
 *     tags:
 *       - Subscribers
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: path
 *         name: subscriberId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Subscriber deleted successfully
 *       404:
 *         description: Subscriber not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotFoundErrorResponse'
 */
router.delete('/:subscriberId', validateGetSubscriberById, subscriberController.deleteSubscriberRecord);

module.exports = router;