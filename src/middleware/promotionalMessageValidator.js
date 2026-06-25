const CUSTOMER_ID_REGEX = /^CUST-\d+-[A-Z0-9]{10}$/;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const validateCreatePromotionalMessage = (req, res, next) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Request body must be a JSON object'],
    });
  }

  const errors = [];
  const rawCustomerId = req.body.customerid ?? req.body.customerId;
  const { title, message } = req.body;

  let normalizedCustomerId = '';
  let trimmedTitle = '';
  let trimmedMessage = '';

  if (rawCustomerId === undefined || rawCustomerId === null) {
    errors.push('Customer ID is required');
  } else if (typeof rawCustomerId !== 'string') {
    errors.push('Customer ID must be a string');
  } else {
    normalizedCustomerId = rawCustomerId.trim();

    if (!normalizedCustomerId) {
      errors.push('Customer ID cannot be empty');
    } else if (!CUSTOMER_ID_REGEX.test(normalizedCustomerId)) {
      errors.push(
        'Customer ID format is invalid. Expected format: CUST-{timestamp}-{10 alphanumeric characters}'
      );
    }
  }

  if (title === undefined) {
    errors.push('Title is required');
  } else if (typeof title !== 'string') {
    errors.push('Title must be a string');
  } else {
    trimmedTitle = title.trim();

    if (!trimmedTitle) {
      errors.push('Title cannot be empty');
    } else if (trimmedTitle.length > 120) {
      errors.push('Title must not exceed 120 characters');
    }
  }

  if (message === undefined) {
    errors.push('Message is required');
  } else if (typeof message !== 'string') {
    errors.push('Message must be a string');
  } else {
    trimmedMessage = message.trim();

    if (!trimmedMessage) {
      errors.push('Message cannot be empty');
    } else if (trimmedMessage.length > 5000) {
      errors.push('Message must not exceed 5000 characters');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  req.body = {
    ...req.body,
    customerid: normalizedCustomerId,
    title: trimmedTitle,
    message: trimmedMessage,
  };

  next();
};

module.exports = {
  validateCreatePromotionalMessage,
};