/**
 * Rejection Handler Utility
 *
 * Provides explicit classification and wrappers for background tasks without
 * relying on brittle error message or stack trace keyword matching.
 */

// Track registered background promises
const backgroundPromises = new WeakSet();

/**
 * Register a promise as a known background task.
 * @param {Promise} promise
 * @returns {Promise}
 */
const registerBackgroundPromise = (promise) => {
  if (promise && typeof promise.then === 'function') {
    backgroundPromises.add(promise);
  }
  return promise;
};

/**
 * Safely execute an asynchronous background task or wrap a background promise.
 * Rejections are explicitly tagged with `isBackground = true`.
 *
 * @param {Function|Promise} task - Async function to run or Promise to wrap
 * @returns {Promise}
 */
const safeBackgroundTask = (task) => {
  const promise = typeof task === 'function' ? Promise.resolve().then(() => task()) : Promise.resolve(task);
  registerBackgroundPromise(promise);

  return promise.catch((err) => {
    if (err && typeof err === 'object') {
      err.isBackground = true;
    }
    throw err;
  });
};

/**
 * Check whether an unhandled rejection originated from an explicit background task.
 *
 * @param {*} reason - The rejection error or reason
 * @param {Promise} [promise] - The rejected promise
 * @returns {boolean}
 */
const isBackgroundRejection = (reason, promise) => {
  // Explicit fatal flags always take precedence as critical
  if (reason && (reason.isFatal === true || reason.fatal === true)) {
    return false;
  }

  // Explicit background flags on the error object
  if (
    reason &&
    (reason.isBackground === true ||
      reason.origin === 'background' ||
      reason.scope === 'background' ||
      reason.taskType === 'background')
  ) {
    return true;
  }

  // Check if promise was registered as a background task
  if (promise && backgroundPromises.has(promise)) {
    return true;
  }

  return false;
};

/**
 * Classify a rejection into category 'background' or 'core'.
 *
 * @param {*} reason
 * @param {Promise} [promise]
 * @returns {{ isBackground: boolean, category: 'background'|'core' }}
 */
const classifyRejection = (reason, promise) => {
  const isBg = isBackgroundRejection(reason, promise);
  return {
    isBackground: isBg,
    category: isBg ? 'background' : 'core',
  };
};

module.exports = {
  safeBackgroundTask,
  runBackgroundTask: safeBackgroundTask,
  registerBackgroundPromise,
  isBackgroundRejection,
  classifyRejection,
};
