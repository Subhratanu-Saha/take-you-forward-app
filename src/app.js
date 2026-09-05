require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { logger, ERROR_CODES } = require('./utils/db');
const { API_SUCCESSFUL_HEALTH_MESSAGE } = require('./constants/constant');
const { swaggerSpec, swaggerUi } = require('./config/swagger');
const { subscribeLoyaltyPurchaseEvents } = require('./events/loyaltyEventConsumer');
const { getEventEmitter } = require('./events/eventEmitter');
const contextMiddleware = require('./middleware/contextMiddleware');

const app = express();
const path = require('path');
// Request Context & Correlation ID Propagation Middleware
app.use(contextMiddleware);

// Request Tracing & Performance Logging Middleware (Inline)
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = req.requestId || 'UNKNOWN';

  logger.info('HTTP_REQUEST', `[REQUEST_START] ${req.method} ${req.originalUrl || req.path}`, {
    requestId,
    method: req.method,
    path: req.originalUrl || req.path,
  });

  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    const statusCode = res.statusCode;
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('HTTP_RESPONSE', `[REQUEST_END] ${req.method} ${req.originalUrl || req.path} ${statusCode}`, {
      requestId,
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
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec)
);
app.use('/api/v1/audit-logs', require('./routes/auditRoutes'));

// Malformed JSON syntax error handler middleware
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const requestId = req.requestId || 'UNKNOWN';
    logger.warn('EXPRESS_APP', 'Malformed JSON in request body', {
      requestId,
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

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check application health
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Application is running successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Application is running
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2026-09-01T10:30:00.000Z
 *                 requestId:
 *                   type: string
 *                   example: 550e8400-e29b-41d4-a716-446655440000
 */
// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: API_SUCCESSFUL_HEALTH_MESSAGE,
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

/**
 * @swagger
 * /api-docs.json:
 *   get:
 *     summary: Get OpenAPI specification in JSON format
 *     tags:
 *       - Documentation
 *     responses:
 *       200:
 *         description: Returns the OpenAPI 3.0 specification for the entire API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
app.get('/api-docs.json', (req, res) => {
  const requestId = req.requestId || 'UNKNOWN';
  logger.info('SWAGGER_SPEC', 'OpenAPI specification requested', {
    requestId,
  });
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(swaggerSpec);
});

// Customer API Routes
app.use('/api/v1/customers', require('./routes/customerRoutes'));

// Other Existing Routes (Untouched)
app.use('/api/v1/interactions', require('./routes/interactionRoutes'));
app.use('/api/v1/subscriber', require('./routes/subscriberRoutes'));
app.use('/api/v1/promotionalmessage', require('./routes/promotionalMessageRoutes'));
app.use('/api/v1/loyalty', require('./routes/loyaltyRoutes'));
app.use('/api/v1/orders', require('./routes/orderRoutes'));

// Initialize Event Subscriber for Loyalty Purchase Events
(() => {
  try {
    getEventEmitter();
    subscribeLoyaltyPurchaseEvents();

    logger.info('EVENT_SUBSCRIBER', 'Loyalty purchase event subscriber initialized', {
      eventName: 'customer.purchase',
    });
  } catch (error) {
    logger.error('EVENT_SUBSCRIBER', 'Failed to initialize loyalty purchase event subscriber', {
      error: error.message,
    });
  }
})();


const dashboardDirectory = path.join(
  __dirname,
  '../public/admin/audit-dashboard'
);

app.use(
  '/admin/audit-dashboard',
  express.static(dashboardDirectory, { index: false })
);

app.get('/admin/audit-dashboard', (req, res) => {
  res.sendFile(path.join(dashboardDirectory, 'index.html'));
});

// Catch-all 404 Route Not Found handler
app.use((req, res) => {
  const requestId = req.requestId || 'UNKNOWN';
  logger.warn('ROUTE_HANDLER', `[ROUTE_NOT_FOUND] ${req.method} ${req.path}`, {
    requestId,
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
  const requestId = req.requestId || 'UNKNOWN';
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.errorCode || ERROR_CODES.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal server error';

  logger.error('GLOBAL_ERROR', `[GLOBAL_ERROR] ${req.method} ${req.path} failed: ${message}`, {
    requestId,
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
