const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../utils/db');
const { logger, ValidationError, ConflictError, NotFoundError } = require('../utils/db');
const config = require('../config');

const AUTH_ERROR_CODE = 'AUTH_INVALID_CREDENTIALS';
const TOKEN_ERROR_CODE = 'AUTH_INVALID_TOKEN';

const sanitizeStaffUser = (user) => {
  if (!user) return null;
  const { passwordhash, password, ...safeUser } = user;
  return safeUser;
};

const getJwtSecret = () => config.jwtSecret || process.env.JWT_SECRET || 'development-jwt-secret';

const generateToken = (user) => jwt.sign(
  {
    userId: user.staffid || user.userId || user.id,
    email: user.email,
    role: user.role,
  },
  getJwtSecret(),
  { expiresIn: config.jwtExpiresIn || process.env.JWT_EXPIRES_IN || '1h' }
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

  const user = await prisma.staffuser.findUnique({ where: { email: normalizedEmail } });

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

  const isPasswordValid = await bcrypt.compare(String(password), user.passwordhash || '');
  if (!isPasswordValid) {
    const error = new Error('Invalid credentials');
    error.statusCode = 401;
    error.errorCode = AUTH_ERROR_CODE;
    logger.warn('AUTH_SERVICE', 'Failed login attempt for existing user', {
      requestId,
      userId: user.staffid,
      statusCode: 401,
      errorCode: AUTH_ERROR_CODE,
    });
    throw error;
  }

  const token = generateToken(user);
  logger.info('AUTH_SERVICE', 'User login successful', {
    requestId,
    userId: user.staffid,
    email: user.email,
    role: user.role,
  });

  return {
    token,
    user: sanitizeStaffUser(user),
  };
};

const createStaffUser = async ({ firstname, lastname, email, password, role = 'ADMIN' }, requestId = null) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedRole = role || 'ADMIN';
  const trimmedFirstName = String(firstname || '').trim();
  const trimmedLastName = String(lastname || '').trim();

  if (!trimmedFirstName) {
    throw new ValidationError('First name is required', 'VALIDATION_FAILED');
  }
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ValidationError('Valid email is required', 'VALIDATION_FAILED');
  }
  if (!password || String(password).trim().length < 8) {
    throw new ValidationError('Password must be at least 8 characters long', 'VALIDATION_FAILED');
  }
  if (!['SUPER_ADMIN', 'ADMIN'].includes(normalizedRole)) {
    throw new ValidationError('Role must be SUPER_ADMIN or ADMIN', 'VALIDATION_FAILED');
  }

  const existingUser = await prisma.staffuser.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    throw new ConflictError('User with this email already exists', 'USER_ALREADY_EXISTS');
  }

  const passwordhash = await bcrypt.hash(String(password), 10);
  const staffid = `STF-${Date.now()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  const createdUser = await prisma.staffuser.create({
    data: {
      staffid,
      firstname: trimmedFirstName,
      lastname: trimmedLastName || null,
      email: normalizedEmail,
      passwordhash,
      role: normalizedRole,
      isactive: true,
      createdat: new Date(),
      updatedat: new Date(),
    },
  });

  logger.info('AUTH_SERVICE', 'Staff user created successfully', {
    requestId,
    userId: staffid,
    email: normalizedEmail,
    role: normalizedRole,
  });

  return sanitizeStaffUser(createdUser);
};

const getAuthenticatedUser = async (userId, requestId = null) => {
  const user = await prisma.staffuser.findUnique({ where: { staffid: userId } });

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
    return jwt.verify(token, getJwtSecret());
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
};
