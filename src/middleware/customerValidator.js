const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;
const pincodeRegex = /^\d{6}$/;

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

// Validate Get All Customers (optional query params)
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
  validateCustomerId,
  validateGetAllCustomers,
};
