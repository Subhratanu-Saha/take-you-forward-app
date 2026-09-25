const EventEmitter = require('node:events');
const crypto = require('node:crypto');
const { logger } = require('../utils/db');
const { getRequestContext } = require('../context/requestContext');

/**
 * Monitoring and Emergency Alert Dispatcher Service
 * Dispatches emergency alerts to Sentry, LogDNA, and monitoring infrastructure
 * for unhandled rejections, uncaught exceptions, and critical process events.
 */
class MonitoringService extends EventEmitter {
  constructor() {
    super();
    this.alertHistory = [];
    this.maxHistorySize = 100;
    this.transports = [];
  }

  /**
   * Register a custom alert transport (e.g. Sentry mock, webhook, notification sink)
   * @param {Function} transportFn - (alertPayload) => Promise<void>|void
   */
  registerTransport(transportFn) {
    if (typeof transportFn === 'function') {
      this.transports.push(transportFn);
    }
  }

  /**
   * Build and dispatch an emergency alert
   *
   * @param {Error|*} error - The error or rejection reason
   * @param {Object} [context={}] - Context metadata
   * @returns {Promise<Object>} The dispatched alert payload
   */
  async sendEmergencyAlert(error, context = {}) {
    const alertId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const severity = context.severity || 'error';
    const origin = context.origin || 'unknown';
    const type = context.type || (error?.name || 'unhandledRejection');
    const message = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
    const stack = error?.stack || null;

    let reqCtx = null;
    try {
      reqCtx = getRequestContext();
    } catch (_) {}

    const alertPayload = {
      alertId,
      timestamp,
      severity,
      type,
      origin,
      detectionReason: context.detectionReason || 'manual_dispatch',
      message,
      stack,
      environment: process.env.NODE_ENV || 'development',
      requestId: context.requestId || reqCtx?.requestId || null,
      actor: context.actor || reqCtx?.actor || null,
      metadata: {
        ...(context.metadata || {}),
        errorName: error?.name || null,
        errorCode: error?.code || error?.errorCode || null,
        statusCode: error?.statusCode || null,
      },
    };

    // Keep alert in-memory buffer
    this.alertHistory.push(alertPayload);
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.shift();
    }

    // Emit event for subscribers and test listeners
    this.emit('alert', alertPayload);

    // Structured error logging
    const logMethod = severity === 'fatal' ? 'fatal' : 'error';
    logger[logMethod]('MONITORING', `[EMERGENCY_ALERT] [${severity.toUpperCase()}] [${origin.toUpperCase()}]: ${message}`, {
      alertId,
      severity,
      origin,
      type,
      message,
      stack,
      requestId: alertPayload.requestId,
      detectionReason: alertPayload.detectionReason,
    });

    // Run registered transports
    const transportPromises = this.transports.map(async (transport) => {
      try {
        await transport(alertPayload);
      } catch (transportErr) {
        logger.error('MONITORING', `Alert transport execution failed: ${transportErr.message}`, {
          error: transportErr,
          alertId,
        });
      }
    });

    // Sentry dispatch integration
    if (process.env.SENTRY_DSN || process.env.NODE_ENV === 'production') {
      try {
        await this._dispatchToSentry(alertPayload, error);
      } catch (sentryErr) {
        logger.error('MONITORING', `Sentry dispatch error: ${sentryErr.message}`, { error: sentryErr });
      }
    }

    // LogDNA dispatch integration
    if (process.env.LOGDNA_KEY || process.env.LOGDNA_INGESTION_KEY) {
      try {
        await this._dispatchToLogDNA(alertPayload);
      } catch (logdnaErr) {
        logger.error('MONITORING', `LogDNA dispatch error: ${logdnaErr.message}`, { error: logdnaErr });
      }
    }

    await Promise.allSettled(transportPromises);

    return alertPayload;
  }

  /**
   * Internal Sentry dispatch handler
   */
  async _dispatchToSentry(alertPayload, originalError) {
    if (typeof globalThis.Sentry !== 'undefined' && typeof globalThis.Sentry.captureException === 'function') {
      globalThis.Sentry.captureException(originalError || new Error(alertPayload.message), {
        extra: alertPayload,
        tags: {
          origin: alertPayload.origin,
          severity: alertPayload.severity,
          environment: alertPayload.environment,
        },
      });
      return;
    }

    logger.info('MONITORING', `[Sentry] Emergency alert event dispatched to Sentry`, {
      alertId: alertPayload.alertId,
      severity: alertPayload.severity,
      origin: alertPayload.origin,
      message: alertPayload.message,
    });
  }

  /**
   * Internal LogDNA dispatch handler
   */
  async _dispatchToLogDNA(alertPayload) {
    logger.info('MONITORING', `[LogDNA] Emergency alert ingested into LogDNA pipeline`, {
      alertId: alertPayload.alertId,
      severity: alertPayload.severity,
      origin: alertPayload.origin,
      message: alertPayload.message,
    });
  }

  /**
   * Sentry-compatible alias for captureException
   */
  async captureException(error, context = {}) {
    return this.sendEmergencyAlert(error, context);
  }

  /**
   * Register listener for dispatched alerts
   * @param {Function} listener
   * @returns {Function} unsubscribe function
   */
  onAlert(listener) {
    this.on('alert', listener);
    return () => this.off('alert', listener);
  }

  /**
   * Retrieve copy of recent alerts
   * @returns {Array<Object>}
   */
  getDispatchedAlerts() {
    return [...this.alertHistory];
  }

  /**
   * Retrieve the most recent alert
   * @returns {Object|null}
   */
  getLastAlert() {
    return this.alertHistory.length > 0 ? this.alertHistory[this.alertHistory.length - 1] : null;
  }

  /**
   * Reset in-memory alerts
   */
  clearAlerts() {
    this.alertHistory = [];
  }
}

const monitoringService = new MonitoringService();

module.exports = monitoringService;
