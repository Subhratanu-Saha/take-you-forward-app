const express = require('express');
const promotionalMessageController = require('../controllers/promotionalMessageController');
const { validateCreatePromotionalMessage } = require('../middleware/promotionalMessageValidator');
const { validatePromotionalCampaign } = require('../middleware/promotionalCampaignValidator');

const router = express.Router();

/**
 * @swagger
 * /api/v1/promotionalmessage/dlq:
 *   get:
 *     summary: Retrieve failed promotional messages from Dead Letter Queue
 *     description: |
 *       Get all promotional messages that failed to send and were moved to the DLQ (Dead Letter Queue).
 *       These are messages that exhausted retry attempts and require manual intervention or retry.
 *       Response includes failure reasons, retry counts, and original payloads for debugging.
 *     tags:
 *       - Promotional Messages
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *     responses:
 *       200:
 *         description: DLQ messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PromotionalDLQ'
 *                 count:
 *                   type: integer
 *                   example: 5
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ServerErrorResponse'
 */
router.get('/dlq', promotionalMessageController.getFailedPromotionalMessages);

/**
 * @swagger
 * /api/v1/promotionalmessage/retry:
 *   post:
 *     summary: Retry failed promotional messages from DLQ
 *     description: |
 *       Attempt to resend promotional messages that are currently in the Dead Letter Queue.
 *       This endpoint allows manual retry of failed campaigns with the original payload.
 *       Successful retries are moved back to normal processing; continued failures remain in DLQ.
 *     tags:
 *       - Promotional Messages
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Optional body. The service retries the pending DLQ batch (up to 50 records).
 *     responses:
 *       200:
 *         description: Retry operation completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   description: Results for the pending DLQ batch
 *                   items:
 *                     type: object
 *                     properties:
 *                       eventId:
 *                         type: string
 *                       status:
 *                         type: string
 *       400:
 *         description: Validation error - invalid DLQ IDs
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
router.post('/retry', promotionalMessageController.retryFailedPromotionalMessages);

/**
 * @swagger
 * /api/v1/promotionalmessage/campaign:
 *   post:
 *     summary: Send a promotional campaign to multiple customers
 *     description: |
 *       Dispatch a promotional campaign to a target audience of customers.
 *       The campaign payload includes message template, audience targeting, and delivery preferences.
 *       Messages are queued for asynchronous delivery and tracked for audit logging.
 *     tags:
 *       - Promotional Messages
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - campaignId
 *               - promoCode
 *               - discountPercentage
 *               - campaignHeadline
 *               - storeUrl
 *             properties:
 *               campaignId:
 *                 type: string
 *                 example: CAM-1750000000000-XYZ789
 *                 description: Unique campaign identifier
 *               subject:
 *                 type: string
 *                 example: "50% Off - Limited Time Offer"
 *                 description: Email subject or message title
 *               promoCode:
 *                 type: string
 *                 example: SAVE50
 *                 description: Promotional code
 *               discountPercentage:
 *                 type: number
 *                 example: 50
 *                 description: Discount percentage from 0 to 100
 *               campaignHeadline:
 *                 type: string
 *                 example: "50% Off - Limited Time Offer"
 *                 description: Campaign headline
 *               storeUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/shop
 *                 description: HTTPS store URL
 *               startDate:
 *                 type: string
 *                 format: date-time
 *               endDate:
 *                 type: string
 *                 format: date-time
 *               metadata:
 *                 type: object
 *                 example: { "promotionCode": "SAVE50", "expiryDate": "2026-09-30" }
 *                 description: Additional campaign metadata
 *     responses:
 *       200:
 *         description: Campaign processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Campaign queued for delivery"
 *                 data:
 *                   type: object
 *                   properties:
 *                     campaignId:
 *                       type: string
 *                     matched:
 *                       type: integer
 *                     sent:
 *                       type: integer
 *                     skipped:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *       400:
 *         description: Validation error - invalid campaign data
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
router.post('/campaign', validatePromotionalCampaign, promotionalMessageController.sendPromotionalCampaign);

/**
 * @swagger
 * /api/v1/promotionalmessage:
 *   post:
 *     summary: Create a single promotional message
 *     description: |
 *       Create and queue a promotional message for a single customer.
 *       The message is stored and scheduled for delivery based on the specified channel.
 *     tags:
 *       - Promotional Messages
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
 *               - title
 *               - message
 *             properties:
 *               customerid:
 *                 type: string
 *                 example: CUST-1750000000000-ABC123
 *                 description: Target customer ID
 *               title:
 *                 type: string
 *                 example: "Special Offer for You"
 *                 description: Promotional email subject/title
 *               message:
 *                 type: string
 *                 example: "Exclusive deal available now"
 *                 description: Promotional message content
 *               metadata:
 *                 type: object
 *                 example: { "templateId": "promo-v1", "sendAt": "2026-09-02T10:00:00Z" }
 *                 description: Additional message metadata
 *     responses:
 *       201:
 *         description: Promotional message created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error - invalid channel or missing required fields
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
router.post('/', validateCreatePromotionalMessage, promotionalMessageController.createPromotionalMessage);

module.exports = router;