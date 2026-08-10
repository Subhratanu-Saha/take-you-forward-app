const prisma = require('../utils/db');
const { logger, handlePrismaError } = require('../utils/db');
const generateRandomAlphaNumeric = require('../utils/idGenerator');

const generateOrderId = () => {
  const timestamp = Date.now();
  const randomStr = generateRandomAlphaNumeric(6);

  return `ORD-${timestamp}-${randomStr}`;
};

// Get all orders
const getAllOrders = async (requestId = null) => {
  logger.info('ORDER_MODEL', 'Fetching all orders from database', {
    requestId,
    operation: 'getAllOrders',
  });

  try {
    const orders = await prisma.orderheader.findMany({
      include: {
        customer: true,
        orderlineitems: true,
      },
    });

    logger.info(
      'ORDER_MODEL',
      `Successfully fetched ${orders.length} orders`,
      {
        requestId,
        operation: 'getAllOrders',
      }
    );

    return orders;
  } catch (error) {
    throw handlePrismaError(error, {
      operation: 'getAllOrders',
      model: 'ORDER_MODEL',
      requestId,
    });
  }
};

// Get order by ID
const getOrderById = async (orderId, requestId = null) => {
  logger.info('ORDER_MODEL', `Fetching order by ID: ${orderId}`, {
    requestId,
    operation: 'getOrderById',
    orderId,
  });

  try {
    const normalizedOrderId = orderId?.trim();

    if (!normalizedOrderId) {
      throw new Error('Order ID is required');
    }

    const order = await prisma.orderheader.findUnique({
      where: {
        orderid: normalizedOrderId,
      },
      include: {
        customer: true,
        orderlineitems: true,
      },
    });

    return order;
  } catch (error) {
    throw handlePrismaError(error, {
      operation: 'getOrderById',
      model: 'ORDER_MODEL',
      requestId,
      resourceId: orderId,
    });
  }
};

// Get orders by customer ID
const getOrdersByCustomerId = async (customerid, requestId = null) => {
  logger.info(
    'ORDER_MODEL',
    `Fetching orders for customer: ${customerid}`,
    {
      requestId,
      operation: 'getOrdersByCustomerId',
      customerId: customerid,
    }
  );

  try {
    const normalizedCustomerId = customerid?.trim();

    if (!normalizedCustomerId) {
      throw new Error('Customer ID is required');
    }

    const orders = await prisma.orderheader.findMany({
      where: {
        customerid: normalizedCustomerId,
      },
      include: {
        orderlineitems: true,
      },
      orderBy: {
        orderid: 'desc',
      },
    });

    logger.info(
      'ORDER_MODEL',
      `Successfully fetched ${orders.length} orders for customer: ${normalizedCustomerId}`,
      {
        requestId,
        operation: 'getOrdersByCustomerId',
        customerId: normalizedCustomerId,
      }
    );

    return orders;
  } catch (error) {
    throw handlePrismaError(error, {
      operation: 'getOrdersByCustomerId',
      model: 'ORDER_MODEL',
      requestId,
      resourceId: customerid,
    });
  }
};

// Create a new order
const createOrder = async (orderData, requestId = null) => {
  logger.info('ORDER_MODEL', 'Creating new order in DB', {
    requestId,
    operation: 'createOrder',
    customerId: orderData?.customerid,
  });
  

  try {
    const createdOrder = await prisma.orderheader.create({
      data: {
        orderid: orderData.orderid || generateOrderId(),
        customerid: orderData.customerid,
        totalamount: Number(orderData.totalamount),
        taxamount:
          orderData.taxamount !== undefined
            ? Number(orderData.taxamount)
            : 0,
        channel: orderData.channel || 'WEB',
        payment: orderData.payment,
        discount:
          orderData.discount !== undefined
            ? Number(orderData.discount)
            : 0,
        isloyalty: orderData.isloyalty ?? false,
        syslastmodifieddt: new Date(),
      },
      include: {
        customer: true,
        orderlineitems: true,
      },
    });

    logger.info(
      'ORDER_MODEL',
      `Successfully created order: ${createdOrder.orderid}`,
      {
        requestId,
        operation: 'createOrder',
        orderId: createdOrder.orderid,
        customerId: createdOrder.customerid,
      }
    );

    return createdOrder;
  } catch (error) {
    throw handlePrismaError(error, {
      operation: 'createOrder',
      model: 'ORDER_MODEL',
      requestId,
      resourceId: orderData.orderid,
    });
  }
};

// Update order
const updateOrder = async (orderId, orderData, requestId = null) => {
  logger.info('ORDER_MODEL', `Updating order in DB: ${orderId}`, {
    requestId,
    operation: 'updateOrder',
    orderId,
  });

  const normalizedOrderId = orderId?.trim();

  if (!normalizedOrderId) {
    throw new Error('Order ID is required');
  }

  try {
    const updatedOrder = await prisma.orderheader.update({
      where: {
        orderid: normalizedOrderId,
      },
      data: {
        customerid: orderData.customerid,
        totalamount:
          orderData.totalamount !== undefined
            ? Number(orderData.totalamount)
            : undefined,
        taxamount:
          orderData.taxamount !== undefined
            ? Number(orderData.taxamount)
            : undefined,
        channel: orderData.channel,
        payment: orderData.payment,
        discount:
          orderData.discount !== undefined
            ? Number(orderData.discount)
            : undefined,
        isloyalty: orderData.isloyalty,
        syslastmodifieddt: new Date(),
      },
      include: {
        customer: true,
        orderlineitems: true,
      },
    });

    logger.info(
      'ORDER_MODEL',
      `Successfully updated order: ${normalizedOrderId}`,
      {
        requestId,
        operation: 'updateOrder',
        orderId: normalizedOrderId,
      }
    );

    return updatedOrder;
  } catch (error) {
    throw handlePrismaError(error, {
      operation: 'updateOrder',
      model: 'ORDER_MODEL',
      requestId,
      resourceId: normalizedOrderId,
    });
  }
};

module.exports = {
  getAllOrders,
  getOrderById,
  getOrdersByCustomerId,
  createOrder,
  updateOrder,
};