// src/middleware/custValidator.js

// Common regex (defined once)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\d{10}$/;
const pincodeRegex = /^\d{6}$/;

// 🔹 Update Customer Validation
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

// 🔹 Delete Customer Validation
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

module.exports = {
  validateUpdateCustomer,
  validateDeleteCustomer
};