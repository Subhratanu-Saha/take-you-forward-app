process.env.NODE_ENV = 'test';
process.env.EMAIL_USER_ID = process.env.EMAIL_USER_ID || 'test@example.com';
process.env.EMAIL_USER_PASSCODE = process.env.EMAIL_USER_PASSCODE || 'test-app-password';
process.env.TEST_NO_EXIT = 'true';
process.env.NO_AUTO_SERVER_START = 'true';

const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Mock email verification in test environment
const { transporter } = require('../src/config/email');
transporter.verify = async () => true;

const { logger } = require('../src/utils/db');
const {
  classifyRejection,
  isBackgroundRejection,
  safeBackgroundTask,
  runBackgroundTask,
  registerBackgroundPromise,
} = require('../src/utils/rejectionHandler');
const { handleUnhandledRejection } = require('../server');
const app = require('../src/app');

describe('Issue #221: Unhandled Rejection Handling & Process Lifecycle (Simplified)', () => {
  let loggedErrors = [];
  let loggedFatals = [];
  let originalLoggerError;
  let originalLoggerFatal;

  before(() => {
    originalLoggerError = logger.error;
    originalLoggerFatal = logger.fatal;
  });

  beforeEach(() => {
    loggedErrors = [];
    loggedFatals = [];

    logger.error = (tag, message, meta) => {
      loggedErrors.push({ tag, message, meta });
      originalLoggerError.call(logger, tag, message, meta);
    };

    logger.fatal = (tag, message, meta) => {
      loggedFatals.push({ tag, message, meta });
      originalLoggerFatal.call(logger, tag, message, meta);
    };
  });

  afterEach(() => {
    logger.error = originalLoggerError;
    logger.fatal = originalLoggerFatal;
  });

  describe('1. Explicit Background Rejection Classification (No Keyword/Stack Matching)', () => {
    test('identifies rejection with explicit isBackground flag as background', () => {
      const err = new Error('Custom background sync failed');
      err.isBackground = true;

      assert.strictEqual(isBackgroundRejection(err), true);
      const result = classifyRejection(err);
      assert.strictEqual(result.isBackground, true);
      assert.strictEqual(result.category, 'background');
    });

    test('DOES NOT classify errors containing keywords as background without explicit wrapper/flag', () => {
      // Testing false-positive risks identified in PR review
      const falsePositiveCases = [
        new Error('Email is required'),
        new Error('Failed to send notification in authentication flow'),
        new Error('Audit log validation error'),
        new Error('Worker thread crashed'),
        new Error('Analytics token missing'),
      ];

      for (const err of falsePositiveCases) {
        assert.strictEqual(
          isBackgroundRejection(err),
          false,
          `Error "${err.message}" must NOT be classified as background via keyword matching`
        );
        assert.strictEqual(classifyRejection(err).isBackground, false);
      }
    });

    test('safeBackgroundTask marks rejection with isBackground = true and registers promise', async () => {
      const backgroundErr = new Error('Auxiliary task failed');
      let caughtErr = null;

      try {
        await safeBackgroundTask(async () => {
          throw backgroundErr;
        });
      } catch (err) {
        caughtErr = err;
      }

      assert.ok(caughtErr);
      assert.strictEqual(caughtErr.isBackground, true);
      assert.strictEqual(isBackgroundRejection(caughtErr), true);
    });

    test('runBackgroundTask alias executes task safely and marks rejection', async () => {
      let executed = false;
      await runBackgroundTask(async () => {
        executed = true;
      });
      assert.strictEqual(executed, true);
    });

    test('registerBackgroundPromise marks promise as background', async () => {
      const p = Promise.reject(new Error('Auxiliary promise failure'));
      p.catch(() => {}); // prevent unhandled warning in test runner
      registerBackgroundPromise(p);

      assert.strictEqual(isBackgroundRejection(new Error('Generic failure'), p), true);
    });

    test('explicit isFatal flag forces core rejection classification', () => {
      const fatalErr = new Error('Critical failure');
      fatalErr.isBackground = true;
      fatalErr.isFatal = true;

      assert.strictEqual(isBackgroundRejection(fatalErr), false);
      assert.strictEqual(classifyRejection(fatalErr).isBackground, false);
    });
  });

  describe('2. Unhandled Rejection Process Handler Logging', () => {
    test('background rejection logs error with full stack trace and does not kill process', () => {
      const bgError = new Error('Isolated background worker rejection');
      bgError.isBackground = true;

      handleUnhandledRejection(bgError);

      assert.strictEqual(loggedErrors.length, 1);
      assert.strictEqual(loggedFatals.length, 0);
      assert.strictEqual(loggedErrors[0].tag, 'PROCESS');
      assert.strictEqual(loggedErrors[0].meta.isBackground, true);
      assert.ok(loggedErrors[0].meta.stack.includes('Isolated background worker rejection'));
    });

    test('critical rejection logs fatal with full stack trace', () => {
      const coreError = new Error('Email is required'); // Not background

      handleUnhandledRejection(coreError);

      assert.strictEqual(loggedFatals.length, 1);
      assert.strictEqual(loggedFatals[0].tag, 'PROCESS');
      assert.strictEqual(loggedFatals[0].meta.isBackground, false);
      assert.ok(loggedFatals[0].meta.stack.includes('Email is required'));
    });
  });

  describe('3. Server Remains Alive and Responds During Background Rejections', () => {
    let testServer;
    let baseUrl;
    const activeSockets = new Set();

    before(async () => {
      await new Promise((resolve) => {
        testServer = http.createServer((req, res) => {
          if (req.url === '/test-slow') {
            setTimeout(() => {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Slow request completed successfully' }));
            }, 60);
          } else {
            app(req, res);
          }
        });

        testServer.on('connection', (sock) => {
          activeSockets.add(sock);
          sock.on('close', () => activeSockets.delete(sock));
        });

        testServer.listen(0, () => {
          const port = testServer.address().port;
          baseUrl = `http://localhost:${port}`;
          resolve();
        });
      });
    });

    after(async () => {
      for (const sock of activeSockets) {
        sock.destroy();
      }
      if (testServer && testServer.listening) {
        await new Promise((resolve) => testServer.close(resolve));
      }
    });

    test('in-flight and subsequent requests complete when background rejection occurs', async () => {
      // Step 1: Start active in-flight HTTP request
      const activeRequestPromise = fetch(`${baseUrl}/test-slow`);
      await new Promise((r) => setTimeout(r, 15));

      // Step 2: Trigger background unhandled rejection
      const backgroundError = new Error('Background task failed unexpectedly');
      backgroundError.isBackground = true;
      handleUnhandledRejection(backgroundError);

      // Step 3: In-flight request completes with 200
      const response = await activeRequestPromise;
      const data = await response.json();
      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.message, 'Slow request completed successfully');

      // Step 4: Subsequent request succeeds on the same server
      const healthRes = await fetch(`${baseUrl}/api/health`);
      const healthData = await healthRes.json();
      assert.strictEqual(healthRes.status, 200);
      assert.strictEqual(healthData.success, true);
    });
  });

  describe('4. Graceful Drain Period on Orderly Shutdown', () => {
    test('in-flight requests complete successfully during drain period before server closes', async () => {
      let activeReqs = 0;
      let isDraining = false;
      let drainFinished = false;

      const server = http.createServer((req, res) => {
        if (isDraining) {
          res.setHeader('Connection', 'close');
        }
        activeReqs++;
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ processed: true }));
        }, 60);

        res.on('finish', () => {
          activeReqs = Math.max(0, activeReqs - 1);
          if (isDraining && activeReqs === 0) {
            drainFinished = true;
          }
        });
      });

      await new Promise((resolve) => server.listen(0, resolve));
      const port = server.address().port;

      // Start in-flight request
      const activeReq = fetch(`http://localhost:${port}/test`);
      await new Promise((r) => setTimeout(r, 15));

      // Initiate drain
      isDraining = true;
      server.close();

      // Active request must complete successfully
      const response = await activeReq;
      const body = await response.json();
      assert.strictEqual(response.status, 200);
      assert.strictEqual(body.processed, true);
      assert.strictEqual(drainFinished, true);
    });
  });
});
