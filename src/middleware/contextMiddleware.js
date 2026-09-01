const crypto = require('crypto');
const { runWithContext } = require('../context/requestContext');

/**
 * Express middleware to initialize, propagate, and bind request context via AsyncLocalStorage.
 *
 * Captures:
 * - requestId from X-Request-Id or X-Correlation-Id header (or generates a UUID)
 * - actor from req.user?.id or X-Actor-Id or X-User-Id (defaults to 'ANONYMOUS')
 * - ipAddress from X-Forwarded-For or req.ip / socket address
 */
const contextMiddleware = (req, res, next) => {
  const incomingRequestId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const requestId = incomingRequestId || crypto.randomUUID();

  const actor =
    req.user?.id ||
    req.user?.userId ||
    req.headers['x-actor-id'] ||
    req.headers['x-user-id'] ||
    'ANONYMOUS';

  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress = forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';

  const context = {
    requestId,
    actor: String(actor),
    ipAddress: String(ipAddress),
    method: req.method,
    path: req.originalUrl || req.path,
    startTime: Date.now(),
  };

  // Bind to req and set header on outgoing response
  req.requestId = requestId;
  req.actor = context.actor;
  req.ipAddress = context.ipAddress;
  res.setHeader('X-Request-Id', requestId);

  runWithContext(context, () => {
    next();
  });
};

module.exports = contextMiddleware;
module.exports.contextMiddleware = contextMiddleware;
