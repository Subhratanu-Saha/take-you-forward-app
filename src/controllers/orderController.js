const { logger, ERROR_CODES } = require('../utils/db');

let orderService;

try {
  orderService = require('../services/orderService');
} catch (error) {
  orderService = null;
}

const getOrderService = () => {
  if (!orderService) {
    throw Object.assign(new Error('Order service is not available'), {
      statusCode: 501,
      errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
      isOperational: true,
    });
  }

  return orderService;
};

// GET all orders
const getAllOrders = async (req, res, next) => {
  const requestId = req.requestId;
  logger.info('ORDER_CONTROLLER', 'Handling getAllOrders request', { requestId, operation: 'getAllOrders' });

  try {
    const service = getOrderService();
    const orders = await service.getAllOrders(requestId);

    logger.info('ORDER_CONTROLLER', `getAllOrders succeeded with ${orders.length} records`, {
      requestId,
      operation: 'getAllOrders',
      statusCode: 200,
    });

    res.status(200).json({
      success: true,
      message: 'Orders fetched successfully',
      data: orders,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const errorCode = error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;

    logger.error('ORDER_CONTROLLER', `getAllOrders failed: ${error.message}`, {
      requestId,
      operation: 'getAllOrders',
      statusCode,
      errorCode,
      error,
    });

    if (error.isOperational) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
        errorCode,
      });
    }

    next(error);
  }
};

// GET order by ID
const getOrderById = async (req, res, next) => {
  const requestId = req.requestId;
  const orderId = req.params.orderId;

  logger.info('ORDER_CONTROLLER', `Handling getOrderById request for ID: ${orderId}`, {
    requestId,
    operation: 'getOrderById',
    orderId,
  });

  try {
    const service = getOrderService();
    const order = await service.getOrderById(orderId, requestId);

    logger.info('ORDER_CONTROLLER', `getOrderById succeeded for ID: ${orderId}`, {
      requestId,
      operation: 'getOrderById',
      orderId,
      statusCode: 200,
    });

    res.status(200).json({
      success: true,
      message: 'Order fetched successfully',
      data: order,
    });
  } catch (error) {
    const statusCode = error.statusCode || 404;
    const errorCode = error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;

    logger.warn('ORDER_CONTROLLER', `getOrderById failed for ID: ${orderId} - ${error.message}`, {
      requestId,
      operation: 'getOrderById',
      orderId,
      statusCode,
      errorCode,
    });

    if (error.isOperational) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
        errorCode,
      });
    }

    next(error);
  }
};

// CREATE new order
const createOrder = async (req, res, next) => {
  const requestId = req.requestId;

  logger.info('ORDER_CONTROLLER', 'Handling createOrder request', {
    requestId,
    operation: 'createOrder',
  });

  try {
    const service = getOrderService();
    // Prefer validated payload if present (middleware sets `req.validated.body`)
    const validatedBody = req.validated && req.validated.body ? req.validated.body : null;

    // Ensure service receives `items` array — map `orderlineitems` from validator to `items`
    const payload = {
      ...(validatedBody || req.body || {}),
      items: (validatedBody && validatedBody.orderlineitems) || (req.body && (req.body.orderlineitems || req.body.orderLineItems || req.body.items)) || [],
    };

    const order = await service.createOrder(payload, requestId);

    logger.info('ORDER_CONTROLLER', `createOrder succeeded for ID: ${order?.id || order?.orderid}`, {
      requestId,
      operation: 'createOrder',
      statusCode: 201,
    });

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    const errorCode = error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;

    logger.error('ORDER_CONTROLLER', `createOrder failed: ${error.message}`, {
      requestId,
      operation: 'createOrder',
      statusCode,
      errorCode,
      error,
    });

    if (error.isOperational) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
        errorCode,
      });
    }

    next(error);
  }
};

// UPDATE order
const updateOrder = async (req, res, next) => {
  const requestId = req.requestId;
  const orderId = req.params.orderId;

  logger.info('ORDER_CONTROLLER', `Handling updateOrder request for ID: ${orderId}`, {
    requestId,
    operation: 'updateOrder',
    orderId,
  });

  try {
    const service = getOrderService();
    const order = await service.updateOrder(orderId, req.body, requestId);

    logger.info('ORDER_CONTROLLER', `updateOrder succeeded for ID: ${orderId}`, {
      requestId,
      operation: 'updateOrder',
      orderId,
      statusCode: 200,
    });

    res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      data: order,
    });
  } catch (error) {
    const statusCode = error.statusCode || 400;
    const errorCode = error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;

    logger.error('ORDER_CONTROLLER', `updateOrder failed for ID: ${orderId} - ${error.message}`, {
      requestId,
      operation: 'updateOrder',
      orderId,
      statusCode,
      errorCode,
      error,
    });

    if (error.isOperational) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
        errorCode,
      });
    }

    next(error);
  }
};

// DELETE order
const deleteOrder = async (req, res, next) => {
  const requestId = req.requestId;
  const orderId = req.params.orderId;

  logger.info('ORDER_CONTROLLER', `Handling deleteOrder request for ID: ${orderId}`, {
    requestId,
    operation: 'deleteOrder',
    orderId,
  });

  try {
    const service = getOrderService();
    const order = await service.deleteOrder(orderId, requestId);

    logger.info('ORDER_CONTROLLER', `deleteOrder succeeded for ID: ${orderId}`, {
      requestId,
      operation: 'deleteOrder',
      orderId,
      statusCode: 200,
    });

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
      data: order,
    });
  } catch (error) {
    const statusCode = error.statusCode || 404;
    const errorCode = error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;

    logger.warn('ORDER_CONTROLLER', `deleteOrder failed for ID: ${orderId} - ${error.message}`, {
      requestId,
      operation: 'deleteOrder',
      orderId,
      statusCode,
      errorCode,
      error,
    });

    if (error.isOperational) {
      return res.status(statusCode).json({
        success: false,
        message: error.message,
        errorCode,
      });
    }

    next(error);
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
};
