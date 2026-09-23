const crypto = require('crypto');
const { runWithContext } = require('../context/requestContext');

/**
 * Express middleware to initialize, propagate, and bind request context via AsyncLocalStorage.
 *
 * Captures:
 * - requestId from X-Request-Id or X-Correlation-Id header (or generates a UUID)
 * - actor from req.user?.id / req.user?.userId or X-Actor-Id / X-User-Id (defaults to 'ANONYMOUS')
 * - userRole from req.user?.role / req.user?.userRole or X-User-Role (defaults to null)
 * - ipAddress from X-Forwarded-For or req.ip / socket address
 */
const contextMiddleware = (req, res, next) => {
  const incomingRequestId = req.headers['x-request-id'] || req.headers['x-correlation-id'];
  const requestId = incomingRequestId || crypto.randomUUID();

  const resolveActor = () => {
    return (
      req.user?.id ||
      req.user?.userId ||
      req.headers['x-actor-id'] ||
      req.headers['x-user-id'] ||
      'ANONYMOUS'
    );
  };

  const resolveUserRole = () => {
    return (
      req.user?.role ||
      req.user?.userRole ||
      req.headers['x-user-role'] ||
      null
    );
  };

  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress = forwardedFor
    ? forwardedFor.split(',')[0].trim()
    : req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || '127.0.0.1';

  const context = {
    requestId,
    _actor: null,
    _userRole: null,
    get actor() {
      return this._actor || resolveActor();
    },
    set actor(val) {
      this._actor = val;
    },
    get userRole() {
      return this._userRole !== null ? this._userRole : resolveUserRole();
    },
    set userRole(val) {
      this._userRole = val;
    },
    ipAddress: String(ipAddress),
    method: req.method,
    path: req.originalUrl || req.path,
    startTime: Date.now(),
  };

  // Bind to req and set header on outgoing response
  req.requestId = requestId;
  Object.defineProperty(req, 'actor', {
    configurable: true,
    enumerable: true,
    get: () => context.actor,
    set: (val) => {
      context.actor = val;
    },
  });
  Object.defineProperty(req, 'userRole', {
    configurable: true,
    enumerable: true,
    get: () => context.userRole,
    set: (val) => {
      context.userRole = val;
    },
  });
  req.ipAddress = context.ipAddress;
  res.setHeader('X-Request-Id', requestId);

  runWithContext(context, () => {
    next();
  });
};

module.exports = contextMiddleware;
module.exports.contextMiddleware = contextMiddleware;
