

const { logger, ERROR_CODES } = require('../utils/db');
const { validateJsonContentType } = require('./index');

const ORDER_ID_REGEX = /^ORD-\d+-[A-Z0-9]{6}$/;
const CUSTOMER_ID_REGEX = /^CUST-\d+-[A-Z0-9]{10}$/;
const MAX_CHANNEL_LENGTH = 10;
const MAX_PAYMENT_LENGTH = 10;

const buildValidationErrorResponse = (res, requestId, errors, statusCode = 400) => {
  const errorCode = ERROR_CODES?.ORDER_VALIDATION_FAILED || 'ORDER_VALIDATION_FAILED';

  logger.warn('ORDER_VALIDATOR', 'Order request validation failed', {
    requestId,
    statusCode,
    errorCode,
    errors,
  });

  return res.status(statusCode).json({
    success: false,
    message: 'Validation failed',
    errorCode,
    errors,
  });
};

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const normalizeBoolean = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  const normalized = value.toString().trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
};

const validateOrderLineItems = (items) => {
  const errors = [];
  const normalizedItems = [];

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('orderlineitems must be a non-empty array');
    return { errors, normalizedItems };
  }

  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push(`orderlineitems[${index}] must be an object`);
      return;
    }

    const skuid = (item.skuid || item.skuId || item.skuID || '').toString().trim();
    const skuitem = (item.skuitem || item.skuItem || '').toString().trim();
    const skuquantity = normalizeNumber(item.skuquantity ?? item.skuQuantity);
    const skuprice = normalizeNumber(item.skuprice ?? item.skuPrice);

    if (!skuid) {
      errors.push(`orderlineitems[${index}].skuid is required`);
    }
    if (!skuitem) {
      errors.push(`orderlineitems[${index}].skuitem is required`);
    }
    if (skuquantity === undefined || !Number.isInteger(skuquantity) || skuquantity <= 0) {
      errors.push(`orderlineitems[${index}].skuquantity must be a positive integer`);
    }
    if (skuprice === undefined || skuprice < 0) {
      errors.push(`orderlineitems[${index}].skuprice must be a non-negative number`);
    }

    normalizedItems.push({
      skuid,
      skuitem,
      skuquantity: skuquantity?.toString(),
      skuprice,
    });
  });

  return { errors, normalizedItems };
};

const validateOrderId = (req, res, next) => {
  const requestId = req.requestId;
  const orderId = req.params.orderId;
  const errors = [];

  if (!orderId?.toString().trim()) {
    errors.push('Order ID is required');
  }  else if (!/^ORD-\d+-[A-Z0-9]+$/.test(orderId.toString().trim())) {
    errors.push('Invalid orderId format. Expected: ORD-{timestamp}-{6 alphanumeric chars}');
  }

  if (errors.length) {
    return buildValidationErrorResponse(res, requestId, errors);
  }

  req.validated = {
    ...(req.validated || {}),
    params: { orderId: orderId.toString().trim() },
  };

  return next();
};

const validateCustomerIdParam = (req, res, next) => {
  const requestId = req.requestId;
  const customerId = req.params.customerId;
  const errors = [];

  if (!customerId?.toString().trim()) {
    errors.push('Customer ID is required');
  } else if (!CUSTOMER_ID_REGEX.test(customerId.toString().trim())) {
    errors.push('Invalid customerId format. Expected: CUST-{timestamp}-{10 alphanumeric chars}');
  }

  if (errors.length) {
    return buildValidationErrorResponse(res, requestId, errors);
  }

  req.validated = {
    ...(req.validated || {}),
    params: { customerId: customerId.toString().trim() },
  };

  return next();
};

const validateQueryPagination = (req, res, next) => {
  const requestId = req.requestId;
  const { page, limit } = req.query;
  const errors = [];
  let pageValue = 1;
  let limitValue = 20;

  if (page !== undefined) {
    const parsed = Number(page);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.push('page must be a positive integer');
    } else {
      pageValue = parsed;
    }
  }

  if (limit !== undefined) {
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.push('limit must be a positive integer');
    } else {
      limitValue = parsed;
    }
  }

  if (errors.length) {
    return buildValidationErrorResponse(res, requestId, errors);
  }

  req.validated = {
    ...(req.validated || {}),
    query: { page: pageValue, limit: limitValue },
  };

  return next();
};

const validateGetAllOrders = (req, res, next) => {
  const requestId = req.requestId;
  const { page, limit } = req.query;
  const errors = [];
  let pageValue = 1;
  let limitValue = 20;

  if (page !== undefined) {
    const parsed = Number(page);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.push('page must be a positive integer');
    } else {
      pageValue = parsed;
    }
  }

  if (limit !== undefined) {
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      errors.push('limit must be a positive integer');
    } else {
      limitValue = parsed;
    }
  }

  if (errors.length) {
    return buildValidationErrorResponse(res, requestId, errors);
  }

  req.validated = {
    ...(req.validated || {}),
    query: { page: pageValue, limit: limitValue },
  };

  return next();
};

const validateDeleteOrder = (req, res, next) => {
  return validateOrderId(req, res, next);
};

const validateCreateOrder = (req, res, next) => {
  const requestId = req.requestId;
  const contentTypeError = validateJsonContentType(req);
  if (contentTypeError) {
    return buildValidationErrorResponse(res, requestId, [contentTypeError], 415);
  }

  const body = req.body || {};
  const errors = [];

  const customerid = (body.customerid || body.customerId || '').toString().trim();
  const payment = (body.payment || '').toString().trim();
  const channel = body.channel !== undefined ? body.channel.toString().trim() : undefined;
  const totalamount = normalizeNumber(body.totalamount);
  const taxamount = normalizeNumber(body.taxamount);
  const discount = normalizeNumber(body.discount);
  const isloyalty = normalizeBoolean(body.isloyalty);
  const orderlineitems = body.orderlineitems || body.orderLineItems;

  if (!customerid) {
    errors.push('customerid is required');
  } else if (!CUSTOMER_ID_REGEX.test(customerid)) {
    errors.push('Invalid customerid format. Expected: CUST-{timestamp}-{10 alphanumeric chars}');
  }

  if (!payment) {
    errors.push('payment is required');
  } else if (payment.length > MAX_PAYMENT_LENGTH) {
    errors.push(`payment must be at most ${MAX_PAYMENT_LENGTH} characters`);
  }

  if (channel !== undefined && channel.length > MAX_CHANNEL_LENGTH) {
    errors.push(`channel must be at most ${MAX_CHANNEL_LENGTH} characters`);
  }

  if (totalamount === undefined || totalamount < 0) {
    errors.push('totalamount is required and must be a non-negative number');
  }

  if (taxamount !== undefined && taxamount < 0) {
    errors.push('taxamount must be a non-negative number');
  }

  if (discount !== undefined && discount < 0) {
    errors.push('discount must be a non-negative number');
  }

  const { errors: lineErrors, normalizedItems } = validateOrderLineItems(orderlineitems);
  if (lineErrors.length) {
    errors.push(...lineErrors);
  }

  if (errors.length) {
    return buildValidationErrorResponse(res, requestId, errors);
  }

  req.validated = {
    ...(req.validated || {}),
    body: {
      customerid,
      payment,
      channel: channel || null,
      totalamount,
      taxamount: taxamount !== undefined ? taxamount : null,
      discount: discount !== undefined ? discount : null,
      isloyalty: isloyalty === undefined ? false : isloyalty,
      orderlineitems: normalizedItems,
    },
  };

  return next();
};

const validateUpdateOrder = (req, res, next) => {
  const requestId = req.requestId;
  const contentTypeError = validateJsonContentType(req);
  if (contentTypeError) {
    return buildValidationErrorResponse(res, requestId, [contentTypeError], 415);
  }

  const orderId = req.params.orderId;
  const body = req.body || {};
  const errors = [];
  const updatePayload = {};

  if (!orderId?.toString().trim()) {
    errors.push('Order ID is required');
  } else if (!ORDER_ID_REGEX.test(orderId.toString().trim())) {
    errors.push('Invalid orderId format. Expected: ORD-{timestamp}-{6 alphanumeric chars}');
  }

  if (body.payment !== undefined) {
    const payment = body.payment?.toString().trim();
    if (!payment) {
      errors.push('payment cannot be empty when provided');
    } else if (payment.length > MAX_PAYMENT_LENGTH) {
      errors.push(`payment must be at most ${MAX_PAYMENT_LENGTH} characters`);
    } else {
      updatePayload.payment = payment;
    }
  }

  if (body.channel !== undefined) {
    const channel = body.channel?.toString().trim();
    if (!channel) {
      errors.push('channel cannot be empty when provided');
    } else if (channel.length > MAX_CHANNEL_LENGTH) {
      errors.push(`channel must be at most ${MAX_CHANNEL_LENGTH} characters`);
    } else {
      updatePayload.channel = channel;
    }
  }

  if (body.taxamount !== undefined) {
    const taxamount = normalizeNumber(body.taxamount);
    if (taxamount === undefined || taxamount < 0) {
      errors.push('taxamount must be a non-negative number when provided');
    } else {
      updatePayload.taxamount = taxamount;
    }
  }

  if (body.discount !== undefined) {
    const discount = normalizeNumber(body.discount);
    if (discount === undefined || discount < 0) {
      errors.push('discount must be a non-negative number when provided');
    } else {
      updatePayload.discount = discount;
    }
  }

  if (body.isloyalty !== undefined) {
    const isloyalty = normalizeBoolean(body.isloyalty);
    if (isloyalty === undefined) {
      errors.push('isloyalty must be a boolean when provided');
    } else {
      updatePayload.isloyalty = isloyalty;
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    errors.push('At least one valid field must be provided for update');
  }

  if (errors.length) {
    return buildValidationErrorResponse(res, requestId, errors);
  }

  req.validated = {
    ...(req.validated || {}),
    params: { orderId: orderId.toString().trim() },
    body: updatePayload,
  };

  return next();
};

module.exports = {
  validateOrderId,
  validateCustomerIdParam,
  validateQueryPagination,
  validateGetAllOrders,
  validateCreateOrder,
  validateUpdateOrder,
  validateDeleteOrder,
};
