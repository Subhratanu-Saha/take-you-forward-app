const jwt = require('jsonwebtoken');
const config = require('../config');
const { logger } = require('../utils/db');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getBearerToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim();
};

const requireAuth = (req, res, next) => {
  const token = getBearerToken(req);

  if (!token) {
    logger.warn('AUTH_MIDDLEWARE', 'Authentication attempt rejected: missing token', {
      requestId: req.requestId,
      path: req.originalUrl || req.path,
      statusCode: 401,
      errorCode: 'AUTH_INVALID_TOKEN',
    });

    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errorCode: 'AUTH_INVALID_TOKEN',
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
    next();
  } catch (error) {
    logger.warn('AUTH_MIDDLEWARE', 'Authentication attempt rejected: invalid token', {
      requestId: req.requestId,
      path: req.originalUrl || req.path,
      statusCode: 401,
      errorCode: 'AUTH_INVALID_TOKEN',
      error: error.message,
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      errorCode: 'AUTH_INVALID_TOKEN',
    });
  }
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    logger.warn('AUTH_MIDDLEWARE', 'Authorization denied for role', {
      requestId: req.requestId,
      path: req.originalUrl || req.path,
      userRole: req.user?.role,
      allowedRoles,
      statusCode: 403,
      errorCode: 'FORBIDDEN',
    });

    return res.status(403).json({
      success: false,
      message: 'Forbidden',
      errorCode: 'FORBIDDEN',
    });
  }

  next();
};

const validateLoginInput = (req, res, next) => {
  const { email, password } = req.body || {};
  const errors = [];

  if (!email || !String(email).trim()) errors.push('Email is required');
  else if (!emailRegex.test(String(email).trim())) errors.push('Invalid email format');

  if (!password || !String(password).trim()) errors.push('Password is required');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errorCode: 'VALIDATION_FAILED',
      errors,
    });
  }

  next();
};

const validateRegisterInput = (req, res, next) => {
  const { firstname, lastname, username, email, password, role } = req.body || {};
  const errors = [];

  if (!firstname || !String(firstname).trim()) errors.push('First name is required');
  if (!email || !String(email).trim()) errors.push('Email is required');
  else if (!emailRegex.test(String(email).trim())) errors.push('Invalid email format');

  if (!password || String(password).trim().length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (role && !['SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_AGENT', 'AUDITOR', 'MARKETING_USER'].includes(role)) {
    errors.push('Role must be SUPER_ADMIN, STORE_MANAGER, SUPPORT_AGENT, AUDITOR, or MARKETING_USER');
  }

  if (username !== undefined && !String(username).trim()) errors.push('Username cannot be empty');

  if (lastname !== undefined && lastname !== null && !String(lastname).trim()) {
    errors.push('Last name cannot be empty');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errorCode: 'VALIDATION_FAILED',
      errors,
    });
  }

  next();
};

const validateJsonContentType = (req) => {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return 'Content-Type must be application/json';
  }
  return null;
};

const {
  authenticate,
  authorizeRoles,
  ROLES,
} = require('./authMiddleware');

module.exports = {
  authMiddleware: requireAuth,
  requireAuth,
  requireRole,
  validateInput: (schema) => (req, res, next) => next(),
  validateLoginInput,
  validateRegisterInput,
  validateJsonContentType,
};
