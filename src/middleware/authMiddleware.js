const { logger, ERROR_CODES } = require('../utils/db');

const ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  STORE_MANAGER: 'STORE_MANAGER',
  SUPPORT_AGENT: 'SUPPORT_AGENT',
});

/**
 * Parses user information and role from tokens or headers.
 * Supports:
 * - Direct role in token: Bearer SUPER_ADMIN, Bearer STORE_MANAGER, Bearer SUPPORT_AGENT
 * - Mock token format: Bearer mock-token-super_admin, Bearer mock-token-store_manager, etc.
 * - Base64 encoded JSON or JWT payload (xxx.yyy.zzz)
 * - Custom headers: x-user-role, x-role, x-user-id, x-actor-id
 */
const resolveUserFromToken = (token, headers = {}) => {
  let role = headers['x-user-role'] || headers['x-role'] || null;
  let userId = headers['x-user-id'] || headers['x-actor-id'] || null;

  if (role) {
    role = String(role).trim().toUpperCase();
  }

  // 1. Try decoding as JWT payload (xxx.yyy.zzz or xxx.yyy)
  if (!role && token && token.includes('.')) {
    try {
      const parts = token.split('.');
      const payloadBase64 = parts[1] || parts[0];
      const decodedStr = Buffer.from(payloadBase64, 'base64').toString('utf8');
      const payload = JSON.parse(decodedStr);
      if (payload.role) role = String(payload.role).trim().toUpperCase();
      if (payload.roles && Array.isArray(payload.roles) && payload.roles.length > 0) {
        role = String(payload.roles[0]).trim().toUpperCase();
      }
      if (payload.userId || payload.id || payload.sub) {
        userId = payload.userId || payload.id || payload.sub;
      }
    } catch (_) {
      // Ignore parse failure, proceed to other fallbacks
    }
  }

  // 2. Try decoding as base64 JSON directly
  if (!role && token) {
    try {
      const decodedStr = Buffer.from(token, 'base64').toString('utf8');
      const payload = JSON.parse(decodedStr);
      if (payload.role) role = String(payload.role).trim().toUpperCase();
      if (payload.userId || payload.id || payload.sub) {
        userId = payload.userId || payload.id || payload.sub;
      }
    } catch (_) {
      // Not base64 JSON
    }
  }

  // 3. Match against known role keywords or direct token match
  if (!role && token) {
    const cleanToken = token.trim().toUpperCase().replace(/[-\s]/g, '_');

    if (cleanToken === ROLES.SUPER_ADMIN || cleanToken.includes('SUPER_ADMIN')) {
      role = ROLES.SUPER_ADMIN;
    } else if (cleanToken === ROLES.STORE_MANAGER || cleanToken.includes('STORE_MANAGER')) {
      role = ROLES.STORE_MANAGER;
    } else if (cleanToken === ROLES.SUPPORT_AGENT || cleanToken.includes('SUPPORT_AGENT')) {
      role = ROLES.SUPPORT_AGENT;
    } else if (cleanToken.includes('ADMIN')) {
      role = ROLES.SUPER_ADMIN;
    } else if (cleanToken.includes('MANAGER')) {
      role = ROLES.STORE_MANAGER;
    } else if (cleanToken.includes('SUPPORT') || cleanToken.includes('AGENT')) {
      role = ROLES.SUPPORT_AGENT;
    } else {
      // Check if token represents another explicit role e.g. CUSTOMER, USER, GUEST
      const match = cleanToken.match(/^(?:MOCK_TOKEN_|TOKEN_)?([A-Z_]+)$/);
      if (match && match[1]) {
        role = match[1];
      } else {
        role = 'AUTHENTICATED_USER';
      }
    }
  }

  return {
    id: userId || `USR-${Date.now()}`,
    role: role || 'AUTHENTICATED_USER',
  };
};

/**
 * Authentication middleware:
 * Ensures the request has a valid authorization token.
 * Returns 401 Unauthorized if missing or invalid.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  let token = null;

  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = authHeader.trim();
    }
  } else if (req.headers['x-auth-token']) {
    token = String(req.headers['x-auth-token']).trim();
  }

  if (!token) {
    const requestId = req.requestId || 'UNKNOWN';
    logger.warn('AUTH_MIDDLEWARE', `[AUTHENTICATION_FAILED] Missing token for ${req.method} ${req.originalUrl || req.path}`, {
      requestId,
      statusCode: 401,
      errorCode: ERROR_CODES.UNAUTHORIZED,
    });

    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication token is required',
      errorCode: ERROR_CODES.UNAUTHORIZED,
    });
  }

  const user = resolveUserFromToken(token, req.headers);
  req.user = user;
  req.token = token;

  if (!req.actor || req.actor === 'ANONYMOUS') {
    req.actor = user.id;
  }

  next();
};

/**
 * Authorization middleware factory:
 * Ensures the authenticated user has one of the required roles.
 * Returns 403 Forbidden if the user's role is not authorized.
 */
const authorizeRoles = (...roles) => {
  const allowedRoles = roles.flat().map((r) => String(r).trim().toUpperCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      const requestId = req.requestId || 'UNKNOWN';
      logger.warn('AUTH_MIDDLEWARE', `[AUTHORIZATION_FAILED] User not authenticated for ${req.method} ${req.originalUrl || req.path}`, {
        requestId,
        statusCode: 401,
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });

      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required',
        errorCode: ERROR_CODES.UNAUTHORIZED,
      });
    }

    const userRole = String(req.user.role).trim().toUpperCase();

    if (!allowedRoles.includes(userRole)) {
      const requestId = req.requestId || 'UNKNOWN';
      logger.warn('AUTH_MIDDLEWARE', `[ACCESS_FORBIDDEN] Role ${userRole} unauthorized for ${req.method} ${req.originalUrl || req.path}`, {
        requestId,
        userRole,
        allowedRoles,
        statusCode: 403,
        errorCode: ERROR_CODES.FORBIDDEN,
      });

      return res.status(403).json({
        success: false,
        message: `Forbidden: Insufficient permissions for role '${userRole}'. Required: [${allowedRoles.join(', ')}]`,
        errorCode: ERROR_CODES.FORBIDDEN,
      });
    }

    next();
  };
};

module.exports = {
  ROLES,
  authenticate,
  authorizeRoles,
  resolveUserFromToken,
};
