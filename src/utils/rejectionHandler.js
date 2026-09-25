const { getRequestContext } = require('../context/requestContext');

// WeakMap to store metadata for registered background promises
const backgroundPromiseRegistry = new WeakMap();

/**
 * Common keywords identifying isolated, non-critical background or auxiliary tasks
 * (e.g. analytics, audit logs, webhooks, notifications, email, event consumer)
 */
const BACKGROUND_KEYWORDS = [
  'analytics',
  'audit',
  'audit-log',
  'auditlog',
  'webhook',
  'email',
  'nodemailer',
  'notification',
  'background',
  'worker',
  'auxiliary',
  'telemetry',
  'loyaltyevent',
  'eventconsumer',
  'event_consumer',
  'eventemitter',
  'event_emitter',
  'subscriber',
  'cron',
  'metrics',
  'logdna',
  'sentry',
];

/**
 * Register a promise as an isolated background task
 * @param {Promise} promise
 * @param {Object} [metadata={}]
 * @returns {Promise}
 */
const registerBackgroundPromise = (promise, metadata = {}) => {
  if (promise && typeof promise.then === 'function') {
    backgroundPromiseRegistry.set(promise, {
      registeredAt: Date.now(),
      ...metadata,
    });
  }
  return promise;
};

/**
 * Execute an async function or track a promise as a safe background task
 * @param {Function|Promise} task
 * @param {Object} [options={}]
 * @returns {Promise}
 */
const runBackgroundTask = (task, options = {}) => {
  const promise = typeof task === 'function' ? Promise.resolve().then(() => task()) : Promise.resolve(task);
  registerBackgroundPromise(promise, {
    taskName: options.name || 'anonymous_background_task',
    ...options,
  });

  return promise.catch((err) => {
    if (err && typeof err === 'object') {
      err.isBackground = true;
      err.origin = 'background';
    }
    throw err;
  });
};

/**
 * Distinguish between unhandled rejections originating from the core request
 * lifecycle versus isolated background workers / auxiliary tasks.
 *
 * @param {*} reason - The rejection error or value
 * @param {Promise} [promise] - The rejected promise
 * @returns {{ isBackground: boolean, category: 'background'|'core', origin: string, detectionReason: string, metadata: Object }}
 */
const classifyRejection = (reason, promise) => {
  const metadata = {};

  // 1. Explicit fatal override flag: If marked fatal, must trigger orderly core shutdown
  if (reason && (reason.isFatal === true || reason.fatal === true)) {
    return {
      isBackground: false,
      category: 'core',
      origin: 'core',
      detectionReason: 'explicit_fatal_flag',
      metadata,
    };
  }

  // 2. Explicit background flags on the error object
  if (reason && (reason.isBackground === true || reason.background === true)) {
    return {
      isBackground: true,
      category: 'background',
      origin: 'background',
      detectionReason: 'explicit_background_flag',
      metadata,
    };
  }

  if (reason && (reason.origin === 'background' || reason.scope === 'background')) {
    return {
      isBackground: true,
      category: 'background',
      origin: 'background',
      detectionReason: 'origin_background_scope',
      metadata,
    };
  }

  if (reason && (reason.taskType === 'background' || reason.type === 'background' || reason.isAuxiliary === true)) {
    return {
      isBackground: true,
      category: 'background',
      origin: 'background',
      detectionReason: 'task_type_auxiliary',
      metadata,
    };
  }

  // 3. Operational AppErrors that are expected/safe to recover from without memory corruption
  if (reason && reason.isOperational === true) {
    return {
      isBackground: true,
      category: 'background',
      origin: 'background',
      detectionReason: 'operational_app_error',
      metadata: { errorCode: reason.errorCode, statusCode: reason.statusCode },
    };
  }

  // 4. Check registered background promise registry
  if (promise && backgroundPromiseRegistry.has(promise)) {
    const regMeta = backgroundPromiseRegistry.get(promise);
    return {
      isBackground: true,
      category: 'background',
      origin: 'background',
      detectionReason: 'registered_background_promise',
      metadata: regMeta,
    };
  }

  // 5. Keyword & Component matching on message, name, stack, or custom properties
  const messageStr = String(reason?.message || reason || '').toLowerCase();
  const stackStr = String(reason?.stack || '').toLowerCase();
  const nameStr = String(reason?.name || '').toLowerCase();
  const componentStr = String(reason?.component || '').toLowerCase();

  for (const keyword of BACKGROUND_KEYWORDS) {
    if (
      messageStr.includes(keyword) ||
      nameStr.includes(keyword) ||
      componentStr.includes(keyword) ||
      stackStr.includes(keyword)
    ) {
      return {
        isBackground: true,
        category: 'background',
        origin: 'background',
        detectionReason: `keyword_match_${keyword}`,
        metadata: { matchedKeyword: keyword },
      };
    }
  }

  // 6. Request Context analysis (AsyncLocalStorage)
  try {
    const ctx = getRequestContext();
    if (ctx) {
      if (ctx.isBackground === true || ctx.scope === 'background') {
        return {
          isBackground: true,
          category: 'background',
          origin: 'background',
          detectionReason: 'background_request_context',
          metadata: { requestId: ctx.requestId },
        };
      }

      // If there is no active HTTP requestId in context,
      // it is running in an isolated background process, subscriber, or worker
      if (!ctx.requestId) {
        return {
          isBackground: true,
          category: 'background',
          origin: 'background',
          detectionReason: 'outside_request_context',
          metadata: { context: ctx },
        };
      }
    }
  } catch (_) {}

  // 7. Default: Core request lifecycle or unclassified critical error
  return {
    isBackground: false,
    category: 'core',
    origin: 'core',
    detectionReason: 'core_request_lifecycle_default',
    metadata,
  };
};

/**
 * Convenience helper to check if a rejection is from an isolated background task
 * @param {*} reason
 * @param {Promise} [promise]
 * @returns {boolean}
 */
const isBackgroundRejection = (reason, promise) => {
  return classifyRejection(reason, promise).isBackground;
};

module.exports = {
  classifyRejection,
  isBackgroundRejection,
  runBackgroundTask,
  registerBackgroundPromise,
  BACKGROUND_KEYWORDS,
};
