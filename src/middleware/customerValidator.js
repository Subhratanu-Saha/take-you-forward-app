const { logger, ERROR_CODES } = require('../utils/db');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;
const pincodeRegex = /^\d{6}$/;

// ==================== PROTECTED FIELDS ====================
// Fields that cannot be updated after customer creation
const PROTECTED_FIELDS = ['firstname', 'emailadd', 'dob', 'customerid'];

/**
 * Check if data contains any protected fields
 * @param {Object} data - Data object to check
 * @returns {Array} - Array of protected field names found in data
 */
const checkProtectedFields = (data) => {
  if (!data || typeof data !== 'object') return [];
  return PROTECTED_FIELDS.filter(field => field in data);
};

const validateCreateCustomer = (req, res, next) => {
  const requestId = req.requestId;
  const {
    firstname,
    emailadd,
    contactnum,
    addressline1,
    city,
    pincode,
    dob,
  } = req.body || {};

  const errors = [];

  if (!firstname?.trim()) errors.push('First name is required');
  if (!emailadd?.trim()) errors.push('Email is required');
  else if (!emailRegex.test(emailadd)) errors.push('Invalid email format');

  if (!contactnum?.trim()) errors.push('Contact number is required');
  else if (!phoneRegex.test(contactnum.replace(/\D/g, '')))
    errors.push('Invalid phone number (must be 10 digits)');

  if (!addressline1?.trim()) errors.push('Address is required');
  if (!city?.trim()) errors.push('City is required');
  if (!pincode?.trim()) errors.push('Pincode is required');
  else if (!pincodeRegex.test(pincode))
    errors.push('Invalid pincode (must be 6 digits)');

  if (dob) {
    const dobDate = new Date(dob);
    const age = Math.floor(
      (new Date() - dobDate) / (365.25 * 24 * 60 * 60 * 1000)
    );

    if (Number.isNaN(dobDate.getTime()) || age < 18 || age > 120) {
      errors.push('Invalid date of birth');
    }
  }

  if (errors.length) {
    logger.warn('CUSTOMER_VALIDATOR', 'Create customer validation failed', {
      requestId,
      statusCode: 400,
      errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
      errors,
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
      errors,
    });
  }

  next();
};

// Validate Customer ID
const validateCustomerId = (req, res, next) => {
  const requestId = req.requestId;
  const { customerId } = req.params;

  const customerIdRegex = /^CUST-\d+-[A-Z0-9]{10}$/;

  if (!customerId || !customerIdRegex.test(customerId)) {
    const msg = "Invalid customer ID format. Expected format: CUST-{timestamp}-{10 alphanumeric characters}";
    logger.warn('CUSTOMER_VALIDATOR', msg, {
      requestId,
      customerId,
      statusCode: 400,
      errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
    });

    return res.status(400).json({
      success: false,
      message: msg,
      errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
    });
  }

  next();
};

// Update Customer Validation
function validateUpdateCustomer(req, res, next) {
  const requestId = req.requestId;
  const { customerId } = req.params;
  const { contactnum, pincode } = req.body || {};

  // Validate Customer ID
  if (!customerId || !customerId.toString().trim()) {
    logger.warn('CUSTOMER_VALIDATOR', 'Customer ID is required for update', {
      requestId,
      statusCode: 400,
      errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
    });
    return res.status(400).json({
      success: false,
      message: "Customer ID is required",
      errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
    });
  }

  const protectedFieldsInRequest = checkProtectedFields(req.body);
  if (protectedFieldsInRequest.length > 0) {
    const msg = `You cannot update these fields: ${protectedFieldsInRequest.join(', ')}`;
    logger.warn('CUSTOMER_VALIDATOR', msg, {
      requestId,
      customerId,
      statusCode: 400,
      errorCode: ERROR_CODES.CUSTOMER_PROTECTED_FIELD,
      protectedFields: protectedFieldsInRequest,
    });
    return res.status(400).json({
      success: false,
      message: msg,
      errorCode: ERROR_CODES.CUSTOMER_PROTECTED_FIELD,
    });
  }

  // Validate Contact Number (10 digits)
  if (contactnum) {
    const cleanedNumber = contactnum.toString().replace(/\D/g, '');
    if (!phoneRegex.test(cleanedNumber)) {
      logger.warn('CUSTOMER_VALIDATOR', 'Invalid contact number format in update', {
        requestId,
        customerId,
        statusCode: 400,
        errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
      });
      return res.status(400).json({
        success: false,
        message: "Invalid contact number (must be 10 digits)",
        errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
      });
    }
  }

  // Validate Pincode (6 digits)
  if (pincode && !pincodeRegex.test(pincode.toString())) {
    logger.warn('CUSTOMER_VALIDATOR', 'Invalid pincode format in update', {
      requestId,
      customerId,
      statusCode: 400,
      errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
    });
    return res.status(400).json({
      success: false,
      message: "Invalid pincode (must be 6 digits)",
      errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
    });
  }

  next();
}

// Delete Customer Validation
function validateDeleteCustomer(req, res, next) {
  const requestId = req.requestId;
  const { customerId } = req.params;

  if (!customerId || !customerId.toString().trim()) {
    logger.warn('CUSTOMER_VALIDATOR', 'Customer ID is required for delete', {
      requestId,
      statusCode: 400,
      errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
    });
    return res.status(400).json({
      success: false,
      message: "Customer ID is required",
      errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
    });
  }

  next();
}

// Get All Customers Validation
const validateGetAllCustomers = (req, res, next) => {
  const requestId = req.requestId;
  const { page, limit } = req.query;

  if (page) {
    const pageNum = Number(page);
    if (isNaN(pageNum) || pageNum <= 0) {
      logger.warn('CUSTOMER_VALIDATOR', 'Invalid page parameter', {
        requestId,
        statusCode: 400,
        errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
      });
      return res.status(400).json({
        success: false,
        message: "Page must be a positive number",
        errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
      });
    }
  }

  if (limit) {
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum <= 0) {
      logger.warn('CUSTOMER_VALIDATOR', 'Invalid limit parameter', {
        requestId,
        statusCode: 400,
        errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
      });
      return res.status(400).json({
        success: false,
        message: "Limit must be a positive number",
        errorCode: ERROR_CODES.CUSTOMER_VALIDATION_FAILED,
      });
    }
  }

  next();
};

module.exports = {
  validateCreateCustomer,
  checkProtectedFields,
  PROTECTED_FIELDS,
  validateCustomerId,
  validateUpdateCustomer,
  validateDeleteCustomer,
  validateGetAllCustomers,
};
