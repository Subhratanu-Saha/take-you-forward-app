/**
 * Test Process Entry Point
 *
 * Mounts test-only triggers without modifying or polluting src/app.js.
 * Supports both HTTP `/test/trigger-rejection` and IPC messages.
 */
const express = require('express');
const app = require('../../src/app');
const { safeBackgroundTask } = require('../../src/utils/rejectionHandler');

const testRouter = express.Router();
testRouter.use(express.json());

testRouter.post('/test/trigger-rejection', (req, res) => {
  const { type = 'background', message } = req.body || {};

  if (type === 'background') {
    const err = new Error(message || 'Intentional background unhandled rejection');
    safeBackgroundTask(Promise.reject(err));
    return res.status(200).json({ success: true, type: 'background' });
  }

  // Core unhandled rejection without background wrapper
  Promise.reject(new Error(message || 'Intentional core unhandled rejection'));
  return res.status(200).json({ success: true, type: 'core' });
});

// Mount test router before the catch-all 404 handler
app.use(testRouter);
if (app.router && Array.isArray(app.router.stack)) {
  const testLayer = app.router.stack.pop();
  // Insert before the last catch-all handlers
  const insertIndex = Math.max(0, app.router.stack.length - 2);
  app.router.stack.splice(insertIndex, 0, testLayer);
}

// Support IPC triggers if spawned with IPC
process.on('message', (msg) => {
  if (msg?.action === 'trigger') {
    if (msg.type === 'background') {
      const err = new Error(msg.message || 'Background failure');
      safeBackgroundTask(Promise.reject(err));
    } else {
      Promise.reject(new Error(msg.message || 'Critical core failure'));
    }
  }
});

// Start the server
require('../../server');
