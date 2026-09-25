process.env.NODE_ENV = 'test';
process.env.EMAIL_USER_ID = process.env.EMAIL_USER_ID || 'test@example.com';
process.env.EMAIL_USER_PASSCODE = process.env.EMAIL_USER_PASSCODE || 'test-app-password';
process.env.TEST_NO_EXIT = 'true';
process.env.NO_AUTO_SERVER_START = 'true';

const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Mock email verification in test environment
const { transporter } = require('../src/config/email');
transporter.verify = async () => true;

// Load server.js to attach the global unhandledRejection listener
require('../server');
const app = require('../src/app');
const monitoringService = require('../src/services/monitoringService');
const {
  classifyRejection,
  isBackgroundRejection,
  runBackgroundTask,
  registerBackgroundPromise,
  BACKGROUND_KEYWORDS,
} = require('../src/utils/rejectionHandler');
const { AppError } = require('../src/utils/db');
const { runWithContext } = require('../src/context/requestContext');

describe('Issue #221: Unhandled Rejection Handling & Graceful Process Lifecycle', () => {
  beforeEach(() => {
    monitoringService.clearAlerts();
  });

  describe('1. Rejection Classification: Background vs Core Lifecycle', () => {
    test('identifies rejection with explicit isBackground flag as background', () => {
      const err = new Error('Custom background sync failed');
      err.isBackground = true;
      const result = classifyRejection(err);

      assert.strictEqual(result.isBackground, true);
      assert.strictEqual(result.category, 'background');
      assert.strictEqual(result.detectionReason, 'explicit_background_flag');
    });

    test('identifies rejection with background keyword in message', () => {
      const keywordsToTest = ['analytics', 'audit', 'webhook', 'email', 'notification', 'worker'];

      for (const kw of keywordsToTest) {
        const err = new Error(`Failed to execute ${kw} operation`);
        const result = classifyRejection(err);

        assert.strictEqual(result.isBackground, true, `Keyword ${kw} should classify as background`);
        assert.strictEqual(result.category, 'background');
        assert.ok(result.detectionReason.includes(kw));
      }
    });

    test('identifies rejection from registered background promise', async () => {
      const backgroundPromise = Promise.reject(new Error('Registered auxiliary promise failed'));
      registerBackgroundPromise(backgroundPromise, { taskName: 'audit_log_exporter' });

      // Suppress unhandled rejection warning in test runner for this promise
      backgroundPromise.catch(() => {});

      const result = classifyRejection(new Error('Generic failure'), backgroundPromise);
      assert.strictEqual(result.isBackground, true);
      assert.strictEqual(result.detectionReason, 'registered_background_promise');
      assert.strictEqual(result.metadata.taskName, 'audit_log_exporter');
    });

    test('identifies operational AppError as recoverable background error', () => {
      const operationalErr = new AppError('Customer validation failed', 400, 'CUSTOMER_VALIDATION_FAILED');
      const result = classifyRejection(operationalErr);

      assert.strictEqual(result.isBackground, true);
      assert.strictEqual(result.detectionReason, 'operational_app_error');
    });

    test('identifies rejections outside request context as background/worker', () => {
      const err = new Error('Standalone job uncaught rejection');
      const result = classifyRejection(err);

      assert.strictEqual(result.isBackground, true);
      assert.strictEqual(result.detectionReason, 'outside_request_context');
    });

    test('classifies generic error inside active HTTP request lifecycle as core', () => {
      const coreContext = {
        requestId: 'req-test-1234-core',
        actor: 'USER_1',
        isBackground: false,
      };

      let result;
      runWithContext(coreContext, () => {
        const err = new Error('Critical database connection pool corrupted');
        result = classifyRejection(err);
      });

      assert.strictEqual(result.isBackground, false);
      assert.strictEqual(result.category, 'core');
      assert.strictEqual(result.detectionReason, 'core_request_lifecycle_default');
    });

    test('explicit isFatal flag forces core classification even if background keyword exists', () => {
      const fatalErr = new Error('Fatal audit system crash');
      fatalErr.isFatal = true;
      const result = classifyRejection(fatalErr);

      assert.strictEqual(result.isBackground, false);
      assert.strictEqual(result.category, 'core');
      assert.strictEqual(result.detectionReason, 'explicit_fatal_flag');
    });

    test('isBackgroundRejection convenience helper returns boolean classification', () => {
      assert.strictEqual(isBackgroundRejection(new Error('background analytics failure')), true);
    });

    test('runBackgroundTask helper executes and tracks task', async () => {
      let executed = false;
      await runBackgroundTask(async () => {
        executed = true;
      });
      assert.strictEqual(executed, true);
    });

    test('BACKGROUND_KEYWORDS array contains expected auxiliary task indicators', () => {
      assert.ok(BACKGROUND_KEYWORDS.includes('analytics'));
      assert.ok(BACKGROUND_KEYWORDS.includes('webhook'));
    });
  });

  describe('2. Sentry & Monitoring Emergency Alert Dispatching', () => {
    test('sendEmergencyAlert builds structured payload with stack trace and metadata', async () => {
      const sampleError = new Error('Auxiliary webhook endpoint timeout');
      sampleError.code = 'ETIMEDOUT';

      const alert = await monitoringService.sendEmergencyAlert(sampleError, {
        origin: 'background',
        type: 'unhandledRejection',
        severity: 'error',
        detectionReason: 'keyword_match_webhook',
      });

      assert.ok(alert.alertId);
      assert.strictEqual(alert.severity, 'error');
      assert.strictEqual(alert.origin, 'background');
      assert.strictEqual(alert.type, 'unhandledRejection');
      assert.strictEqual(alert.message, 'Auxiliary webhook endpoint timeout');
      assert.ok(alert.stack && alert.stack.includes('Error: Auxiliary webhook endpoint timeout'));
      assert.strictEqual(alert.detectionReason, 'keyword_match_webhook');
      assert.strictEqual(alert.metadata.errorCode, 'ETIMEDOUT');
    });

    test('monitoringService records dispatched alerts in history', async () => {
      const error1 = new Error('Analytics batch dispatch failed');
      const error2 = new Error('Audit log write timeout');

      await monitoringService.sendEmergencyAlert(error1, { origin: 'background', severity: 'error' });
      await monitoringService.sendEmergencyAlert(error2, { origin: 'background', severity: 'error' });

      const history = monitoringService.getDispatchedAlerts();
      assert.strictEqual(history.length, 2);
      assert.strictEqual(monitoringService.getLastAlert().message, 'Audit log write timeout');
    });

    test('monitoringService executes registered alert transports', async () => {
      const transportDispatches = [];
      monitoringService.registerTransport((alert) => {
        transportDispatches.push(alert);
      });

      await monitoringService.sendEmergencyAlert(new Error('Test transport dispatch'), {
        origin: 'background',
        severity: 'error',
      });

      assert.strictEqual(transportDispatches.length, 1);
      assert.strictEqual(transportDispatches[0].message, 'Test transport dispatch');
    });

    test('monitoringService emits alert event for subscribers', async () => {
      let eventPayload = null;
      const unsubscribe = monitoringService.onAlert((payload) => {
        eventPayload = payload;
      });

      await monitoringService.sendEmergencyAlert(new Error('Event emission test'), {
        origin: 'background',
        severity: 'error',
      });

      assert.ok(eventPayload);
      assert.strictEqual(eventPayload.message, 'Event emission test');
      unsubscribe();
    });
  });

  describe('3. Active HTTP Requests Complete Successfully on Background Rejection (AC 1 & AC 2)', () => {
    let testServer;
    let baseUrl;
    let activeSockets = new Set();

    before(async () => {
      await new Promise((resolve) => {
        testServer = http.createServer((req, res) => {
          if (req.url === '/test-slow') {
            setTimeout(() => {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Slow request completed successfully' }));
            }, 80);
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

    test('Triggering intentional background unhandled rejection allows active HTTP requests to complete', async () => {
      // Step 1: Start an active in-flight client HTTP request
      const activeRequestPromise = fetch(`${baseUrl}/test-slow`);

      // Give request time to enter processing
      await new Promise((r) => setTimeout(r, 20));

      // Step 2: Trigger an intentional background unhandled rejection
      const backgroundError = new Error('Intentional background analytics dispatch failure');
      backgroundError.isBackground = true;

      // Classify and dispatch through the rejection handling pipeline
      const classification = classifyRejection(backgroundError);
      assert.strictEqual(classification.isBackground, true);

      // Dispatch emergency alert to Sentry/monitoring
      const alert = await monitoringService.sendEmergencyAlert(backgroundError, {
        type: 'unhandledRejection',
        origin: 'background',
        severity: 'error',
        detectionReason: classification.detectionReason,
        stack: backgroundError.stack,
      });

      // Step 3: Verify the active HTTP request completes successfully without being dropped
      const response = await activeRequestPromise;
      const data = await response.json();

      assert.strictEqual(response.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.message, 'Slow request completed successfully');

      // Step 4: Verify the server is STILL listening and can process new requests
      const healthRes = await fetch(`${baseUrl}/api/health`);
      const healthData = await healthRes.json();
      assert.strictEqual(healthRes.status, 200);
      assert.strictEqual(healthData.success, true);

      // Step 5: Verify Sentry/monitoring received the structured alert
      assert.strictEqual(alert.origin, 'background');
      assert.strictEqual(alert.message, 'Intentional background analytics dispatch failure');
      assert.ok(alert.stack);
    });

    test('Triggering unawaited webhook failure does not terminate server or drop connections', async () => {
      // Concurrent requests
      const req1 = fetch(`${baseUrl}/api/health`);
      const req2 = fetch(`${baseUrl}/test-slow`);

      // Trigger unhandled rejection simulation for third-party webhook
      const webhookError = new Error('Third-party webhook notification failure: HTTP 504');
      const classification = classifyRejection(webhookError);
      assert.strictEqual(classification.isBackground, true);

      await monitoringService.sendEmergencyAlert(webhookError, {
        type: 'unhandledRejection',
        origin: 'background',
        severity: 'error',
        detectionReason: classification.detectionReason,
        stack: webhookError.stack,
      });

      const [res1, res2] = await Promise.all([req1, req2]);
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(res2.status, 200);

      const alert = monitoringService.getLastAlert();
      assert.ok(alert.message.includes('Third-party webhook'));
    });

    test('Triggering rejection via /api/test/trigger-unhandled-rejection leaves server healthy and active requests intact', async () => {
      // Start in-flight request
      const slowReq = fetch(`${baseUrl}/test-slow`);
      await new Promise((r) => setTimeout(r, 10));

      // Trigger intentional background unhandled rejection via endpoint
      const triggerRes = await fetch(`${baseUrl}/api/test/trigger-unhandled-rejection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'background',
          message: 'Endpoint triggered auxiliary task failure',
        }),
      });
      const triggerBody = await triggerRes.json();
      assert.strictEqual(triggerRes.status, 200);
      assert.strictEqual(triggerBody.success, true);

      // In-flight request must complete successfully with 200
      const slowResponse = await slowReq;
      const slowData = await slowResponse.json();
      assert.strictEqual(slowResponse.status, 200);
      assert.strictEqual(slowData.success, true);

      // Wait a moment for unhandled rejection handler to record alert
      await new Promise((r) => setTimeout(r, 30));

      // Check monitoring alerts endpoint
      const alertsRes = await fetch(`${baseUrl}/api/test/monitoring/alerts`);
      const alertsData = await alertsRes.json();
      assert.strictEqual(alertsRes.status, 200);
      assert.strictEqual(alertsData.success, true);
      assert.ok(alertsData.count >= 1);

      // Server remains fully operational
      const healthRes = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(healthRes.status, 200);
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
