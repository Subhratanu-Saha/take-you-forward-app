require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { logger, ERROR_CODES } = require('./utils/db');
const { API_SUCCESSFUL_HEALTH_MESSAGE } = require('./constants/constant');

const app = express();

// Request Tracing & Performance Logging Middleware (Inline)
app.use((req, res, next) => {
  const startTime = Date.now();

  logger.info('HTTP_REQUEST', `[REQUEST_START] ${req.method} ${req.originalUrl || req.path}`, {
    method: req.method,
    path: req.originalUrl || req.path,
  });

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('HTTP_RESPONSE', `[REQUEST_END] ${req.method} ${req.originalUrl || req.path} ${statusCode}`, {
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode,
      durationMs,
    });
  });

  next();
});

// Basic Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Malformed JSON syntax error handler middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn('EXPRESS_APP', 'Malformed JSON in request body', {
      statusCode: 400,
      errorCode: ERROR_CODES.MALFORMED_JSON,
      path: req.path,
    });

    return res.status(400).json({
      success: false,
      message: 'Malformed JSON payload provided',
      errorCode: ERROR_CODES.MALFORMED_JSON,
    });
  }
  next(err);
});

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: API_SUCCESSFUL_HEALTH_MESSAGE,
    timestamp: new Date().toISOString(),
  });
});

// Customer API Routes
app.use('/api/v1/customers', require('./routes/customerRoutes'));

// Other Existing Routes (Untouched)
app.use('/api/v1/interactions', require('./routes/interactionRoutes'));
app.use('/api/v1/subscriber', require('./routes/subscriberRoutes'));
app.use('/api/v1/promotionalmessage', require('./routes/promotionalMessageRoutes'));
app.use('/api/v1/loyalty', require('./routes/loyaltyRoutes'));

// Catch-all 404 Route Not Found handler
app.use((req, res) => {
  logger.warn('ROUTE_HANDLER', `[ROUTE_NOT_FOUND] ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    statusCode: 404,
    errorCode: ERROR_CODES.ROUTE_NOT_FOUND,
  });

  res.status(404).json({
    success: false,
    message: 'Route not found',
    errorCode: ERROR_CODES.ROUTE_NOT_FOUND,
    path: req.path,
  });
});

// Centralized Global Error Handling Middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal server error';

  logger.error('GLOBAL_ERROR', `[GLOBAL_ERROR] ${req.method} ${req.path} failed: ${message}`, {
    method: req.method,
    path: req.path,
    statusCode,
    errorCode,
    error: err,
    stack: err.stack,
  });

  const responseBody = {
    success: false,
    message,
    errorCode,
  };

  if (err.details) {
    responseBody.details = err.details;
  }

  if (process.env.NODE_ENV === 'development') {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
});

module.exports = app;
