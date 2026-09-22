const authService = require('../services/authService');
const { logger, ERROR_CODES } = require('../utils/db');

const login = async (req, res, next) => {
  const requestId = req.requestId;

  try {
    const result = await authService.login(req.body, requestId);
    logger.info('AUTH_CONTROLLER', 'Login request processed successfully', {
      requestId,
      email: req.body?.email,
      statusCode: 200,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token: result.token,
        user: result.user,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const errorCode = error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;
    logger.warn('AUTH_CONTROLLER', `Login failed: ${error.message}`, {
      requestId,
      statusCode,
      errorCode,
      email: req.body?.email,
    });

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Invalid credentials',
      errorCode,
    });
  }
};

const register = async (req, res, next) => {
  const requestId = req.requestId;

  try {
    const user = await authService.createStaffUser(req.body, requestId);
    logger.info('AUTH_CONTROLLER', 'Staff registration processed successfully', {
      requestId,
      email: user?.email,
      role: user?.role,
      statusCode: 201,
    });

    return res.status(201).json({
      success: true,
      message: 'Staff user created successfully',
      data: user,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const errorCode = error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;
    logger.warn('AUTH_CONTROLLER', `Staff registration failed: ${error.message}`, {
      requestId,
      statusCode,
      errorCode,
      email: req.body?.email,
    });

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to create staff user',
      errorCode,
    });
  }
};

const getMe = async (req, res, next) => {
  const requestId = req.requestId;
  const userId = req.user?.userId;

  try {
    const user = await authService.getAuthenticatedUser(userId, requestId);
    logger.info('AUTH_CONTROLLER', 'Authenticated user profile fetched', {
      requestId,
      userId,
      statusCode: 200,
    });

    return res.status(200).json({
      success: true,
      message: 'User profile fetched successfully',
      data: {
        ...user,
        role: user.role,
      },
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    const errorCode = error.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;
    logger.warn('AUTH_CONTROLLER', `Fetching authenticated user failed: ${error.message}`, {
      requestId,
      userId,
      statusCode,
      errorCode,
    });

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Unable to fetch user profile',
      errorCode,
    });
  }
};

module.exports = {
  login,
  register,
  getMe,
};
