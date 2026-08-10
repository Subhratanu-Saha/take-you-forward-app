// Middleware functions

// Authentication middleware (example)
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }
  
  // Add token validation logic here
  next();
};

// Validation middleware (example)
const validateInput = (schema) => {
  return (req, res, next) => {
    // Add validation logic here
    next();
  };
};

const validateJsonContentType = (req) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return 'Content-Type must be application/json';
  }
  return null;
};

module.exports = {
  authMiddleware,
  validateInput,
  validateJsonContentType,
};
