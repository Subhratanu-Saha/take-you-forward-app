const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../utils/db');
const { logger, ValidationError, ConflictError } = require('../utils/db');
const config = require('../config');

const AUTH_ERROR_CODE = 'AUTH_INVALID_CREDENTIALS';
const TOKEN_ERROR_CODE = 'AUTH_INVALID_TOKEN';
const AUTH_ROLES = ['SUPER_ADMIN', 'STORE_MANAGER', 'SUPPORT_AGENT', 'AUDITOR', 'MARKETING_USER'];

const sanitizeStaffUser = (user) => {
  if (!user) return null;
  const { password, role, ...safeUser } = user;
  return { ...safeUser, role: role?.name || role };
};

const generateToken = (user) => jwt.sign(
  {
    userId: user.userid || user.userId || user.id,
    email: user.email,
    role: user.role?.name || user.role,
  },
  config.jwtSecret,
  { expiresIn: config.jwtExpiresIn }
);

const login = async ({ email, password }, requestId = null) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail || !password) {
    const error = new ValidationError('Validation failed', 'VALIDATION_FAILED');
    logger.warn('AUTH_SERVICE', 'Login validation failed', {
      requestId,
      errorCode: 'VALIDATION_FAILED',
      statusCode: 400,
    });
    throw error;
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail }, include: { role: true } });

  if (!user) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    error.errorCode = AUTH_ERROR_CODE;
    logger.warn('AUTH_SERVICE', 'Failed login attempt for unknown email', {
      requestId,
      email: normalizedEmail,
      statusCode: 401,
      errorCode: AUTH_ERROR_CODE,
    });
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(String(password), user.password || '');
  if (!isPasswordValid) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    error.errorCode = AUTH_ERROR_CODE;
    logger.warn('AUTH_SERVICE', 'Failed login attempt for existing user', {
      requestId,
      userId: user.userid,
      statusCode: 401,
      errorCode: AUTH_ERROR_CODE,
    });
    throw error;
  }

  const token = generateToken(user);
  logger.info('AUTH_SERVICE', 'User login successful', {
    requestId,
    userId: user.userid,
    email: user.email,
    role: user.role?.name,
  });

  return {
    token,
    user: sanitizeStaffUser(user),
  };
};

const createStaffUser = async ({ firstname, lastname, username, email, password, role = 'SUPER_ADMIN' }, requestId = null) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRole = role || 'SUPER_ADMIN';
  const trimmedFirstName = String(firstname || '').trim();
  const trimmedLastName = String(lastname || '').trim();
  const normalizedUsername = String(username || `${trimmedFirstName}${trimmedLastName}`).trim().toLowerCase();

  if (!trimmedFirstName) {
    throw new ValidationError('First name is required', 'VALIDATION_FAILED');
  }
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ValidationError('Valid email is required', 'VALIDATION_FAILED');
  }
  if (!password || String(password).trim().length < 8) {
    throw new ValidationError('Password must be at least 8 characters long', 'VALIDATION_FAILED');
  }
  if (!AUTH_ROLES.includes(normalizedRole)) {
    throw new ValidationError(`Role must be one of: ${AUTH_ROLES.join(', ')}`, 'VALIDATION_FAILED');
  }
  if (!normalizedUsername) {
    throw new ValidationError('Username is required', 'VALIDATION_FAILED');
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new ConflictError('User with this email already exists', 'USER_ALREADY_EXISTS');
  }

  const hashedPassword = await bcrypt.hash(String(password), 10);

  const createdUser = await prisma.user.create({
    data: {
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: { connect: { name: normalizedRole } },
      isactive: true,
    },
    include: { role: true },
  });

  logger.info('AUTH_SERVICE', 'Staff user created successfully', {
    requestId,
    userId: createdUser.userid,
    email: normalizedEmail,
    role: normalizedRole,
  });

  return sanitizeStaffUser(createdUser);
};

const getAuthenticatedUser = async (userId, requestId = null) => {
  const user = await prisma.user.findUnique({ where: { userid: userId }, include: { role: true } });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.errorCode = 'USER_NOT_FOUND';
    throw error;
  }

  return sanitizeStaffUser(user);
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    const wrappedError = new Error('Invalid or expired token');
    wrappedError.statusCode = 401;
    wrappedError.errorCode = TOKEN_ERROR_CODE;
    throw wrappedError;
  }
};

module.exports = {
  login,
  createStaffUser,
  generateToken,
  getAuthenticatedUser,
  verifyToken,
  sanitizeStaffUser,
  AUTH_ERROR_CODE,
  AUTH_ROLES,
};
