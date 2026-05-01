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

  next();
};

module.exports = {
  validateCreateCustomer,
  validateUpdateCustomer,
  checkProtectedFields,
  PROTECTED_FIELDS,
};
