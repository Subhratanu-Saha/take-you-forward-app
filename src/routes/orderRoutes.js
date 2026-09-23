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
 *     description: "Retrieve all orders. Required roles: SUPER_ADMIN, STORE_MANAGER, SUPPORT_AGENT."
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Orders
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
 *       500:
 *         description: Internal server error
 */
// GET all orders [/api/v1/orders]
router.get('/', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.SUPPORT_AGENT), validateGetAllOrders, orderController.getAllOrders);

/**
 * @swagger
 * /api/v1/orders/{orderId}:
 *   get:
 *     summary: Get order by ID
 *     description: "Retrieve order by ID. Required roles: SUPER_ADMIN, STORE_MANAGER, SUPPORT_AGENT."
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
// GET order by ID [/api/v1/orders/:orderId]
router.get('/:orderId', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER, ROLES.SUPPORT_AGENT), validateOrderId, orderController.getOrderById);

/**
 * @swagger
 * /api/v1/orders:
 *   post:
 *     summary: Create a new order
 *     description: "Create a new order. Required roles: SUPER_ADMIN, STORE_MANAGER."
 *     security:
 *       - bearerAuth: []
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
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
 *       500:
 *         description: Internal server error
 */
// CREATE new order [/api/v1/orders]
router.post('/', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER), validateCreateOrder, orderController.createOrder);

/**
 * @swagger
 * /api/v1/orders/{orderId}:
 *   put:
 *     summary: Update an order
 *     description: "Update an existing order. Required roles: SUPER_ADMIN, STORE_MANAGER."
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       200:
 *         description: Order updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
// UPDATE order [/api/v1/orders/:orderId]
router.put('/:orderId', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER), validateUpdateOrder, orderController.updateOrder);

/**
 * @swagger
 * /api/v1/orders/{orderId}:
 *   delete:
 *     summary: Delete an order
 *     description: "Delete an existing order. Required roles: SUPER_ADMIN, STORE_MANAGER."
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Orders
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *       401:
 *         description: Unauthorized - Missing or invalid JWT token
 *       403:
 *         description: Forbidden - Insufficient permissions for user role
 *       404:
 *         description: Order not found
 *       500:
 *         description: Internal server error
 */
// DELETE order [/api/v1/orders/:orderId]
router.delete('/:orderId', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER), validateDeleteOrder, orderController.deleteOrder);

module.exports = router;