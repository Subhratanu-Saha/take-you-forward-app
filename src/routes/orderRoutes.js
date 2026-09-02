const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const {
  validateCreateOrder,
  validateUpdateOrder,
  validateDeleteOrder,
  validateOrderId,
  validateGetAllOrders,
} = require('../middleware/orderValidator');

/**
 * @swagger
 * /api/v1/orders:
 *   get:
 *     summary: Get all orders
 *     tags:
 *       - Orders
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 */
// GET all orders [/api/v1/orders]
router.get('/', validateGetAllOrders, orderController.getAllOrders);

// GET order by ID [/api/v1/orders/:orderId]
router.get('/:orderId', validateOrderId, orderController.getOrderById);

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create a new order
 *     tags:
 *       - Orders
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
// CREATE new order [/api/v1/orders]
router.post('/', validateCreateOrder, orderController.createOrder);

// UPDATE order [/api/v1/orders/:orderId]
router.put('/:orderId', validateUpdateOrder, orderController.updateOrder);

// DELETE order [/api/v1/orders/:orderId]
router.delete('/:orderId', validateDeleteOrder, orderController.deleteOrder);

module.exports = router;