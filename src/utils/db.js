const crypto = require('crypto');


// Sensitive field names to automatically redact from log output
const SENSITIVE_FIELDS = [
  'password',
  'passcode',
  'token',
  'jwt',
  'authorization',
  'auth',
  'secret',
  'apikey',
  'api_key',
  'email_user_passcode',
  'cookie',
  'creditcard',
  'cardnumber',
  'cvv',
];

/**
 * Recursively sanitize objects to redact sensitive information before logging
 */
const sanitize = (data) => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (data instanceof Error) {
    return {
      message: data.message,
      name: data.name,
      stack: data.stack,
      code: data.code,
      statusCode: data.statusCode,
    };
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field));

    if (isSensitive) {
      cleaned[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      cleaned[key] = sanitize(value);
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned;
};

/**
 * Format structured log string or object
 */
const formatLog = (level, component, message, metadata = {}) => {
  const timestamp = new Date().toISOString();
  const sanitizedMeta = sanitize(metadata);

  const logPayload = {
    timestamp,
    level,
    component: component || 'APP',
    message,
    ...sanitizedMeta,
  };

  const prefix = `[${timestamp}] [${level}] [${logPayload.component}]`;
  const details = [];

  if (logPayload.requestId) details.push(`requestId=${logPayload.requestId}`);
  if (logPayload.operation) details.push(`operation=${logPayload.operation}`);
  if (logPayload.customerId) details.push(`customerId=${logPayload.customerId}`);
  if (logPayload.statusCode) details.push(`statusCode=${logPayload.statusCode}`);
  if (logPayload.errorCode) details.push(`errorCode=${logPayload.errorCode}`);

  const detailsStr = details.length > 0 ? ` (${details.join(', ')})` : '';
  const formattedLine = `${prefix} ${message}${detailsStr}`;

  return { formattedLine, logPayload };
};

const logger = {
  info(component, message, metadata = {}) {
    const { formattedLine } = formatLog('INFO', component, message, metadata);
    console.log(formattedLine);
  },

  warn(component, message, metadata = {}) {
    const { formattedLine, logPayload } = formatLog('WARN', component, message, metadata);
    console.warn(formattedLine);
    if (logPayload.details && Object.keys(logPayload.details).length > 0) {
      console.warn('  Details:', JSON.stringify(logPayload.details));
    }
  },

  error(component, message, metadata = {}) {
    const { formattedLine, logPayload } = formatLog('ERROR', component, message, metadata);
    console.error(formattedLine);
    if (logPayload.stack) {
      console.error('  Stack:', logPayload.stack);
    } else if (metadata.error && metadata.error.stack) {
      console.error('  Stack:', metadata.error.stack);
    }
  },

  fatal(component, message, metadata = {}) {
    const { formattedLine, logPayload } = formatLog('FATAL', component, message, metadata);
    console.error(`❌ CRITICAL CRASH FATAL: ${formattedLine}`);
    if (logPayload.stack) {
      console.error('  Fatal Stack:', logPayload.stack);
    } else if (metadata.error && metadata.error.stack) {
      console.error('  Fatal Stack:', metadata.error.stack);
    }
  },

  sanitize,
};

// Standardized Application Error Codes
const ERROR_CODES = {
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  CUSTOMER_ALREADY_EXISTS: 'CUSTOMER_ALREADY_EXISTS',
  CUSTOMER_VALIDATION_FAILED: 'CUSTOMER_VALIDATION_FAILED',
  CUSTOMER_PROTECTED_FIELD: 'CUSTOMER_PROTECTED_FIELD',
  MALFORMED_JSON: 'MALFORMED_JSON',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_CONSTRAINT_ERROR: 'DATABASE_CONSTRAINT_ERROR',
  DATABASE_TIMEOUT: 'DATABASE_TIMEOUT',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  EXTERNAL_SERVICE_TIMEOUT: 'EXTERNAL_SERVICE_TIMEOUT',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
};

// Custom App Errors
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = ERROR_CODES.INTERNAL_SERVER_ERROR, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errorCode = ERROR_CODES.CUSTOMER_NOT_FOUND, details = null) {
    super(message, 404, errorCode, details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict', errorCode = ERROR_CODES.CUSTOMER_ALREADY_EXISTS, details = null) {
    super(message, 409, errorCode, details);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed', errorCode = ERROR_CODES.CUSTOMER_VALIDATION_FAILED, details = null) {
    super(message, 400, errorCode, details);
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', statusCode = 500, errorCode = ERROR_CODES.DATABASE_ERROR, details = null) {
    super(message, statusCode, errorCode, details);
  }
}

// Connect Prisma logs to central logger
if (typeof rawPrisma?.$on === 'function') {
  rawPrisma.$on('error', (e) => {
    logger.error('PRISMA_DATABASE', e.message, { target: e.target });
  });

  rawPrisma.$on('warn', (e) => {
    logger.warn('PRISMA_DATABASE', e.message);
  });
}

// Prisma error translator
const handlePrismaError = (error, context = {}) => {
  const { operation = 'DATABASE_OP', model = 'DATABASE', requestId = null, resourceId = null } = context;

  logger.error(model, `Database operation failed: ${error.message}`, {
    operation,
    requestId,
    resourceId,
    code: error.code,
    stack: error.stack,
  });

  if (error.code === 'P2002') {
    const targetFields = Array.isArray(error.meta?.target) ? error.meta.target.join(', ') : 'field';
    return new ConflictError(
      `Unique constraint violation on ${targetFields}`,
      ERROR_CODES.DATABASE_CONSTRAINT_ERROR,
      { target: error.meta?.target }
    );
  }

  if (error.code === 'P2025') {
    return new NotFoundError(
      'Requested database record was not found',
      ERROR_CODES.CUSTOMER_NOT_FOUND,
      { details: error.meta?.cause }
    );
  }

  if (error.code === 'P2003') {
    return new DatabaseError(
      'Foreign key constraint failed',
      400,
      ERROR_CODES.DATABASE_CONSTRAINT_ERROR,
      { field: error.meta?.field_name }
    );
  }

  if (error.code === 'P2024') {
    return new DatabaseError(
      'Database connection pool timeout',
      500,
      ERROR_CODES.DATABASE_TIMEOUT,
      { meta: error.meta }
    );
  }

  if (error.isOperational) {
    return error;
  }

  return new DatabaseError(
    error.message || 'Database error occurred',
    500,
    ERROR_CODES.DATABASE_ERROR,
    { code: error.code }
  );
};

module.exports = prisma;
module.exports.logger = logger;
module.exports.ERROR_CODES = ERROR_CODES;
module.exports.AppError = AppError;
module.exports.NotFoundError = NotFoundError;
module.exports.ConflictError = ConflictError;
module.exports.ValidationError = ValidationError;
module.exports.DatabaseError = DatabaseError;
module.exports.handlePrismaError = handlePrismaError;
