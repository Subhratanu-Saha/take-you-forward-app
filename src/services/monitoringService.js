const { logger } = require('../utils/db');

/**
 * Monitoring Service
 *
 * Lightweight monitoring delegator using centralized logger.
 * Official SDKs (such as @sentry/node) can be integrated here in the future.
 */
const monitoringService = {
  /**
   * Log an error or fatal event to the centralized process logger.
   *
   * @param {Error|string} error
   * @param {Object} [context={}]
   */
  notify(error, context = {}) {
    const isFatal = context.severity === 'fatal';
    const logFn = isFatal ? logger.fatal : logger.error;
    const message = error?.message || (typeof error === 'string' ? error : 'Unknown process error');

    logFn('PROCESS', message, {
      type: context.type || 'unhandledRejection',
      origin: context.origin || 'unknown',
      stack: error?.stack || null,
      ...context.metadata,
    });
  },

  /**
   * Alias for backward compatibility.
   */
  sendEmergencyAlert(error, context = {}) {
    return this.notify(error, context);
  },
};

module.exports = monitoringService;
