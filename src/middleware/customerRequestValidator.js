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
  validateCustomerId,
  validateGetAllCustomers,
};  