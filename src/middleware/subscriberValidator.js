const validateCreateSubscriber = (req, res, next) => {
  const {
    customerid,
    issubscribe,
    emailpermstatus,
    smspermstatus,
  } = req.body;

  const errors = [];

  if (!customerid?.trim()) {
    errors.push('Customer ID is required');
  }

  if (typeof issubscribe !== 'boolean') {
    errors.push('isSubscribe must be a boolean');
  }

  if (typeof emailpermstatus !== 'boolean') {
    errors.push('emailPermStatus must be a boolean');
  }

  if (typeof smspermstatus !== 'boolean') {
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
  const subscriberId = req.params.subscriberId ?? req.params.subscriberid;
  const {
    issubscribe,
    emailpermstatus,
    smspermstatus,
  } = req.body;

  const errors = [];

  if (!subscriberId?.trim()) {
    errors.push('Subscriber ID is required');
  }

  if (issubscribe !== undefined && typeof issubscribe !== 'boolean') {
    errors.push('isSubscribe must be a boolean');
  }

  if (emailpermstatus !== undefined && typeof emailpermstatus !== 'boolean') {
    errors.push('emailPermStatus must be a boolean');
  }

  if (smspermstatus !== undefined && typeof smspermstatus !== 'boolean') {
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
  const subscriberId = req.params.subscriberId ?? req.params.subscriberid;
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
  const customerid = req.params.customerid ?? req.query.customerid;
  const errors = [];

  if (!customerid?.trim()) {
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