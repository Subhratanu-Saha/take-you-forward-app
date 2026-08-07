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

// GET all orders [/api/v1/orders]
router.get('/', validateGetAllOrders, orderController.getAllOrders);

// GET order by ID [/api/v1/orders/:orderId]
router.get('/:orderId', validateOrderId, orderController.getOrderById);

// CREATE new order [/api/v1/orders]
router.post('/', validateCreateOrder, orderController.createOrder);

// UPDATE order [/api/v1/orders/:orderId]
router.put('/:orderId', validateUpdateOrder, orderController.updateOrder);

// DELETE order [/api/v1/orders/:orderId]
router.delete('/:orderId', validateDeleteOrder, orderController.deleteOrder);

module.exports = router;