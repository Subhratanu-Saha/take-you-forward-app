const validateCreateSubscriber = (req, res, next) => {
console.log('Validating create subscriber request body:', req.body);
  const {
<<<<<<< Updated upstream
    customerId = req.body.customerId || req.body.customerid,
    isSubscribe = req.body.isSubscribe ?? req.body.issubscribe,
    emailPermStatus = req.body.emailPermStatus ?? req.body.emailpermstatus,
    smsPermStatus = req.body.smsPermStatus ?? req.body.smspermstatus,
=======
    customerId,
    customerid,
    isSubscribe,
    issubscribe,
    emailPermStatus,
    emailpermstatus,
    smsPermStatus,
    smspermstatus,
>>>>>>> Stashed changes
  } = req.body;

  const normalizedCustomerId = customerId ?? customerid;
  const normalizedIsSubscribe = isSubscribe ?? issubscribe;
  const normalizedEmailPermStatus = emailPermStatus ?? emailpermstatus;
  const normalizedSmsPermStatus = smsPermStatus ?? smspermstatus;

  const errors = [];

  if (!normalizedCustomerId?.toString().trim()) {
    errors.push('Customer ID is required');
  }

  if (typeof normalizedIsSubscribe !== 'boolean') {
    errors.push('isSubscribe must be a boolean');
  }

  if (typeof normalizedEmailPermStatus !== 'boolean') {
    errors.push('emailPermStatus must be a boolean');
  }

  if (typeof normalizedSmsPermStatus !== 'boolean') {
    errors.push('smsPermStatus must be a boolean');
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

const validateUpdateSubscriber = (req, res, next) => {
  const { subscriberId } = req.params;
  const {
    isSubscribe,
    issubscribe,
    emailPermStatus,
    emailpermstatus,
    smsPermStatus,
    smspermstatus,
  } = req.body;

  const normalizedIsSubscribe = isSubscribe ?? issubscribe;
  const normalizedEmailPermStatus = emailPermStatus ?? emailpermstatus;
  const normalizedSmsPermStatus = smsPermStatus ?? smspermstatus;

  const errors = [];

  if (!subscriberId?.trim()) {
    errors.push('Subscriber ID is required');
  }

  if (normalizedIsSubscribe !== undefined && typeof normalizedIsSubscribe !== 'boolean') {
    errors.push('isSubscribe must be a boolean');
  }

  if (normalizedEmailPermStatus !== undefined && typeof normalizedEmailPermStatus !== 'boolean') {
    errors.push('emailPermStatus must be a boolean');
  }

  if (normalizedSmsPermStatus !== undefined && typeof normalizedSmsPermStatus !== 'boolean') {
    errors.push('smsPermStatus must be a boolean');
  }

  if (errors.length) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

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

  next();
};

module.exports = {
  validateCreateSubscriber,
  validateUpdateSubscriber,
  validateGetSubscriberById,
  validateGetSubscriberByCustomerId,
};