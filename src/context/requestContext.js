const { AsyncLocalStorage } = require('node:async_hooks');

// Request-scoped AsyncLocalStorage instance
const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Returns the current request context or a safe default object
 * @returns {Object} { requestId, actor, ipAddress, method, path, startTime }
 */
const getRequestContext = () => {
  const store = asyncLocalStorage.getStore();
  if (store) {
    return store;
  }

  return {
    requestId: null,
    actor: 'ANONYMOUS',
    ipAddress: null,
    method: null,
    path: null,
    startTime: null,
  };
};

/**
 * Executes a callback within a request context
 * @param {Object} context
 * @param {Function} callback
 * @returns {*}
 */
const runWithContext = (context, callback) => {
  return asyncLocalStorage.run(context, callback);
};

/**
 * Helpers to get specific context properties
 */
const getRequestId = () => getRequestContext().requestId;
const getActor = () => getRequestContext().actor;
const getIpAddress = () => getRequestContext().ipAddress;

module.exports = {
  asyncLocalStorage,
  getRequestContext,
  runWithContext,
  getRequestId,
  getActor,
  getIpAddress,
};
