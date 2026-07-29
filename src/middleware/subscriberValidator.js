const validateCreateSubscriber = (req, res, next) => {
console.log('Validating create subscriber request body:', req.body);
  const {
    customerId = req.body.customerId || req.body.customerid,
    isSubscribe = req.body.isSubscribe ?? req.body.issubscribe,
    emailPermStatus = req.body.emailPermStatus ?? req.body.emailpermstatus,
    smsPermStatus = req.body.smsPermStatus ?? req.body.smspermstatus,
  } = req.body;

  const errors = [];

  if (!customerId?.trim()) {
    errors.push('Customer ID is required');
  }

  if (typeof isSubscribe !== 'boolean') {
    errors.push('isSubscribe must be a boolean');
  }

  if (typeof emailPermStatus !== 'boolean') {
    errors.push('emailPermStatus must be a boolean');
  }

  if (typeof smsPermStatus !== 'boolean') {
    errors.push('smsPermStatus must be a boolean');
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }
console.log('Validation passed for create subscriber request body:', req.body);
  next();
};

const validateUpdateSubscriber = (req, res, next) => {
  const { subscriberId } = req.params;
  const {
    isSubscribe,
    emailPermStatus,
    smsPermStatus,
  } = req.body;

  const errors = [];

  if (!subscriberId?.trim()) {
    errors.push('Subscriber ID is required');
  }

  if (isSubscribe !== undefined && typeof isSubscribe !== 'boolean') {
    errors.push('isSubscribe must be a boolean');
  }

  if (emailPermStatus !== undefined && typeof emailPermStatus !== 'boolean') {
    errors.push('emailPermStatus must be a boolean');
  }

  if (smsPermStatus !== undefined && typeof smsPermStatus !== 'boolean') {
    errors.push('smsPermStatus must be a boolean');
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  console.log('Validation passed for update subscriber request body:', req.body);
  next();
};

const validateGetSubscriberById = (req, res, next) => {
  const subscriberId = req.params.subscriberId || req.params.subscriberid;
  const errors = [];

  if (!subscriberId?.trim()) {
    errors.push('Subscriber ID is required');
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  console.log('Validation passed for get subscriber by ID request:', req.params);
  next();
};

const validateGetSubscriberByCustomerId = (req, res, next) => {
  const customerId = req.params.customerId || req.query.customerId || req.query.customerid;
  const errors = [];

  if (!customerId?.trim()) {
    errors.push('Customer ID is required');
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  console.log('Validation passed for get subscriber by customer ID request:', req.params);
  next();
};

module.exports = {
  validateCreateSubscriber,
  validateUpdateSubscriber,
  validateGetSubscriberById,
  validateGetSubscriberByCustomerId,
};