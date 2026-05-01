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
  const {
    firstname,
    emailadd,
    contactnum,
    addressline1,
    city,
    pincode,
    dob,
  } = req.body;

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
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
};

const validateUpdateCustomer = (req, res, next) => {
  const protectedFieldsInRequest = checkProtectedFields(req.body);

  if (protectedFieldsInRequest.length > 0) {
    return res.status(400).json({
      success: false,
      message: `You cannot update these fields: ${protectedFieldsInRequest.join(', ')}`,
    });
  }

// Validate Customer ID
const validateCustomerId = (req, res, next) => {
  const { customerId } = req.params;

  const customerIdRegex = /^CUST-\d+-[A-Z0-9]{10}$/;

  if (!customerId || !customerIdRegex.test(customerId)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid customer ID format. Expected format: CUST-{timestamp}-{10 alphanumeric characters}",
    });
  }

  next();
};

// Update Customer Validation
function validateUpdateCustomer(req, res, next) {
  const { customerId } = req.params;
  const { firstname, emailadd, contactnum, pincode, dob } = req.body || {};

  // Validate Customer ID
  if (!customerId || !customerId.toString().trim()) {
    return res.status(400).json({
      success: false,
      message: "Customer ID is required"
    });
  }

  // Validate First Name (required)
  if (!firstname || !firstname.toString().trim()) {
    return res.status(400).json({
      success: false,
      message: "First name is required"
    });
  }

  // Validate Email
  if (emailadd && !emailRegex.test(emailadd)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format"
    });
  }

  // Validate Contact Number (10 digits)
  if (contactnum) {
    const cleanedNumber = contactnum.toString().replace(/\D/g, '');
    if (!phoneRegex.test(cleanedNumber)) {
      return res.status(400).json({
        success: false,
        message: "Invalid contact number (must be 10 digits)"
      });
    }
  }

  // Validate Pincode (6 digits)
  if (pincode && !pincodeRegex.test(pincode.toString())) {
    return res.status(400).json({
      success: false,
      message: "Invalid pincode (must be 6 digits)"
    });
  }

  // Validate DOB (age between 18–120)
  if (dob) {
    const birthDate = new Date(dob);

    if (isNaN(birthDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format"
      });
    }

    const age = Math.floor(
      (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );

    if (age < 18 || age > 120) {
      return res.status(400).json({
        success: false,
        message: "Invalid date of birth (age must be between 18 and 120)"
      });
    }
  }

  next();
}

// Delete Customer Validation
function validateDeleteCustomer(req, res, next) {
  const { customerId } = req.params;

  if (!customerId || !customerId.toString().trim()) {
    return res.status(400).json({
      success: false,
      message: "Customer ID is required"
    });
  }

  next();
}

// Get All Customers Validation
const validateGetAllCustomers = (req, res, next) => {
  const { page, limit } = req.query;

  if (page) {
    const pageNum = Number(page);
    if (isNaN(pageNum) || pageNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive number",
      });
    }
  }

  if (limit) {
    const limitNum = Number(limit);
    if (isNaN(limitNum) || limitNum <= 0) {
      return res.status(400).json({
        success: false,
        message: "Limit must be a positive number",
      });
    }
  }

  next();
};

module.exports = {
  validateCreateCustomer,
  validateUpdateCustomer,
  checkProtectedFields,
  PROTECTED_FIELDS,
};
  validateCustomerId,
  validateUpdateCustomer,
  validateDeleteCustomer,
  validateGetAllCustomers,
};
