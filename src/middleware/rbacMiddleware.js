const { logger, ERROR_CODES } = require('../utils/db');

const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  STORE_MANAGER: 'STORE_MANAGER',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
  AUDITOR: 'AUDITOR',
  MARKETING_USER: 'MARKETING_USER',
});

/**
 * RBAC authorization middleware factory:
 * Ensures the authenticated user has one of the required roles.
 * Returns 403 Forbidden (FORBIDDEN_INSUFFICIENT_PERMISSIONS) if the user's role is not authorized.
 * If user is not authenticated (req.user missing or has no role), returns 401 Unauthorized (AUTH_TOKEN_MISSING).
 *
 * @param  {...string|string[]} roles - Allowed role(s)
 * @returns {Function} Express middleware function
 */
const authorizeRoles = (...roles) => {
  const allowedRoles = roles.flat().map((r) => String(r).trim().toUpperCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      const requestId = req.requestId || 'UNKNOWN';
      logger.warn('RBAC_MIDDLEWARE', `[AUTHORIZATION_FAILED] User not authenticated for ${req.method} ${req.originalUrl || req.path}`, {
        requestId,
        statusCode: 401,
        errorCode: ERROR_CODES.AUTH_TOKEN_MISSING || 'AUTH_TOKEN_MISSING',
      });

      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required',
        errorCode: ERROR_CODES.AUTH_TOKEN_MISSING || 'AUTH_TOKEN_MISSING',
      });
    }

    const userRole = String(req.user.role).trim().toUpperCase();

    if (!allowedRoles.includes(userRole)) {
      const requestId = req.requestId || 'UNKNOWN';
      logger.warn('RBAC_MIDDLEWARE', `[ACCESS_FORBIDDEN] Role ${userRole} unauthorized for ${req.method} ${req.originalUrl || req.path}`, {
        requestId,
        userRole,
        allowedRoles,
        statusCode: 403,
        errorCode: ERROR_CODES.FORBIDDEN_INSUFFICIENT_PERMISSIONS || 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
      });

      return res.status(403).json({
        success: false,
        message: `Forbidden: Insufficient permissions for role '${userRole}'. Required: [${allowedRoles.join(', ')}]`,
        errorCode: ERROR_CODES.FORBIDDEN_INSUFFICIENT_PERMISSIONS || 'FORBIDDEN_INSUFFICIENT_PERMISSIONS',
      });
    }

    next();
  };
};

module.exports = {
  ROLES,
  authorizeRoles,
};
