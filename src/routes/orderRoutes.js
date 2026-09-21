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
const { authenticate, authorizeRoles, ROLES } = require('../middleware/authMiddleware');

// Domain Security Guards: All order endpoints require authentication
router.use(authenticate);

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
router.get('/', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.SUPPORT_AGENT), validateGetAllOrders, orderController.getAllOrders);

// GET order by ID [/api/v1/orders/:orderId]
router.get('/:orderId', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.SUPPORT_AGENT), validateOrderId, orderController.getOrderById);

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
router.post('/', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER), validateCreateOrder, orderController.createOrder);

// UPDATE order [/api/v1/orders/:orderId]
router.put('/:orderId', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER), validateUpdateOrder, orderController.updateOrder);

// DELETE order [/api/v1/orders/:orderId]
router.delete('/:orderId', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER), validateDeleteOrder, orderController.deleteOrder);

module.exports = router;