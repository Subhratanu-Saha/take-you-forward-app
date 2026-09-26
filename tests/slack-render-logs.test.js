const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const verifySlackSignature = require('../src/middleware/slackAuthMiddleware');
const { sanitizeLogLine, formatLogsForSlack, formatErrorForSlack } = require('../src/utils/slackFormatter');
const RenderLogsService = require('../src/services/renderLogsService');
const SlackController = require('../src/controllers/slackController');
const config = require('../src/config');

describe('Slack Render Log System Tests', () => {
  const TEST_SIGNING_SECRET = 'test-signing-secret-1234567890abcdef';

  beforeEach(() => {
    config.slack = {
      signingSecret: TEST_SIGNING_SECRET,
      allowedChannelId: 'C12345678',
      allowedTeamId: 'T12345678',
      allowedUserIds: null,
    };
    config.render = {
      apiKey: 'rnd_test_mock_key',
      ownerId: 'tea-testowner',
      serviceId: 'srv-testservice',
    };
  });

  describe('1. Secret Scrubber & Slack Formatter', () => {
    test('redacts PostgreSQL database connection URLs with passwords', () => {
      const dirtyLog = 'Connected to postgresql://neondb_owner:superSecretPassword123@ep-falling-dust.aws.neon.tech/TUFDB?sslmode=require';
      const clean = sanitizeLogLine(dirtyLog);
      assert.doesNotMatch(clean, /superSecretPassword123/);
      assert.match(clean, /\[REDACTED_DB_URL\]/);
    });

    test('redacts JWT bearer tokens and headers', () => {
      const dirtyLog = 'Failed auth: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMifQ.abc123xyz456_789';
      const clean = sanitizeLogLine(dirtyLog);
      assert.doesNotMatch(clean, /abc123xyz456_789/);
      assert.match(clean, /Bearer \[REDACTED\]/);
    });

    test('redacts password and secret key-values', () => {
      const dirtyLog = 'Config load: password="VerySecret123!" api_key=rnd_mySuperSecretKey123';
      const clean = sanitizeLogLine(dirtyLog);
      assert.doesNotMatch(clean, /VerySecret123!/);
      assert.doesNotMatch(clean, /rnd_mySuperSecretKey123/);
      assert.match(clean, /\[REDACTED\]/);
    });

    test('formats logs array into Slack Block Kit payload safely', () => {
      const mockLogs = [
        { timestamp: '2026-09-26T10:00:00.000Z', message: 'Server started successfully' },
        { timestamp: '2026-09-26T10:00:05.000Z', message: 'GET /api/health 200' },
      ];
      const payload = formatLogsForSlack({ serviceId: 'srv-test', logs: mockLogs });

      assert.strictEqual(payload.response_type, 'ephemeral');
      assert.ok(Array.isArray(payload.blocks));
      const sectionBlock = payload.blocks.find((b) => b.type === 'section');
      assert.ok(sectionBlock);
      assert.match(sectionBlock.text.text, /Server started successfully/);
      assert.match(sectionBlock.text.text, /GET \/api\/health 200/);
    });

    test('handles empty log array with informative message', () => {
      const payload = formatLogsForSlack({ serviceId: 'srv-test', logs: [] });
      assert.strictEqual(payload.response_type, 'ephemeral');
      const sectionBlock = payload.blocks.find((b) => b.type === 'section');
      assert.match(sectionBlock.text.text, /No recent logs were found/);
    });
  });

  describe('2. Slack HMAC Signature & Timestamp Verification Middleware', () => {
    test('rejects requests missing Slack headers with 401', () => {
      let statusCode = null;
      let jsonBody = null;

      const req = {
        headers: {},
        requestId: 'REQ-1',
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        },
      };

      verifySlackSignature(req, res, () => {
        assert.fail('next() should not be called');
      });

      assert.strictEqual(statusCode, 401);
      assert.strictEqual(jsonBody.success, false);
      assert.match(jsonBody.message, /Missing Slack verification headers/);
    });

    test('rejects requests with timestamp older than 5 minutes (300s) with 400', () => {
      let statusCode = null;
      let jsonBody = null;

      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const req = {
        headers: {
          'x-slack-request-timestamp': String(oldTimestamp),
          'x-slack-signature': 'v0=dummy',
        },
        requestId: 'REQ-OLD',
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        },
      };

      verifySlackSignature(req, res, () => {
        assert.fail('next() should not be called');
      });

      assert.strictEqual(statusCode, 400);
      assert.match(jsonBody.message, /expired or invalid/);
    });

    test('rejects requests with invalid signature with 401', () => {
      let statusCode = null;
      let jsonBody = null;

      const currentTimestamp = Math.floor(Date.now() / 1000);
      const req = {
        headers: {
          'x-slack-request-timestamp': String(currentTimestamp),
          'x-slack-signature': 'v0=0000000000000000000000000000000000000000000000000000000000000000',
        },
        rawBody: Buffer.from('command=%2Frender-logs&text='),
        requestId: 'REQ-BADSIG',
      };
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          jsonBody = data;
          return this;
        },
      };

      verifySlackSignature(req, res, () => {
        assert.fail('next() should not be called');
      });

      assert.strictEqual(statusCode, 401);
      assert.match(jsonBody.message, /Invalid Slack signature/);
    });

    test('accepts requests with valid HMAC signature and calls next()', () => {
      let nextCalled = false;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const rawBody = 'command=%2Frender-logs&text=';
      const sigBasestring = `v0:${currentTimestamp}:${rawBody}`;
      const validSig =
        'v0=' +
        crypto.createHmac('sha256', TEST_SIGNING_SECRET).update(sigBasestring, 'utf8').digest('hex');

      const req = {
        headers: {
          'x-slack-request-timestamp': String(currentTimestamp),
          'x-slack-signature': validSig,
        },
        rawBody: Buffer.from(rawBody),
        requestId: 'REQ-VALID',
      };
      const res = {
        status() {
          return this;
        },
        json() {
          return this;
        },
      };

      verifySlackSignature(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });
  });

  describe('3. Render Logs Service Configuration & Handling', () => {
    test('returns configuration error if required Render keys are missing', async () => {
      config.render = { apiKey: null, ownerId: null, serviceId: null };

      const result = await RenderLogsService.fetchLogs();
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'CONFIGURATION_ERROR');
    });
  });

  describe('4. Slack Controller Authorization & Safety', () => {
    test('rejects commands from unauthorized Slack channel', async () => {
      let responseData = null;
      const req = {
        body: {
          command: '/render-logs',
          channel_id: 'C_WRONG_CHANNEL',
          team_id: 'T12345678',
          user_id: 'U12345',
        },
      };
      const res = {
        status(code) {
          assert.strictEqual(code, 200);
          return this;
        },
        json(data) {
          responseData = data;
          return this;
        },
      };

      await SlackController.handleRenderLogs(req, res);
      assert.strictEqual(responseData.response_type, 'ephemeral');
      assert.match(responseData.blocks[1].text.text, /only permitted in the designated dev channel/);
    });

    test('rejects commands with arbitrary Render service ID injection', async () => {
      let responseData = null;
      const req = {
        body: {
          command: '/render-logs',
          channel_id: 'C12345678',
          team_id: 'T12345678',
          user_id: 'U12345',
          text: 'srv-arbitraryService123',
        },
      };
      const res = {
        status(code) {
          assert.strictEqual(code, 200);
          return this;
        },
        json(data) {
          responseData = data;
          return this;
        },
      };

      await SlackController.handleRenderLogs(req, res);
      assert.strictEqual(responseData.response_type, 'ephemeral');
      assert.match(responseData.blocks[1].text.text, /Specifying custom Render Service IDs is not allowed/);
    });

    test('responds with immediate acknowledgment when response_url is provided', async () => {
      const originalFetch = global.fetch;
      const originalFetchLogs = RenderLogsService.fetchLogs;
      let ackData = null;
      const dispatched = [];
      const req = {
        body: {
          command: '/render-logs',
          channel_id: 'C12345678',
          team_id: 'T12345678',
          user_id: 'U12345',
          text: '20',
          response_url: 'https://hooks.slack.com/commands/123/456',
        },
      };
      const res = {
        status(code) {
          assert.strictEqual(code, 200);
          return this;
        },
        json(data) {
          ackData = data;
          return this;
        },
      };

      try {
        RenderLogsService.fetchLogs = async () => ({
          success: true,
          serviceId: 'srv-testservice',
          logs: [{ timestamp: '2026-09-26T10:00:00.000Z', message: 'background log line' }],
        });
        global.fetch = async (url, options) => {
          dispatched.push({ url, options });
          return { ok: true, status: 200 };
        };

        await SlackController.handleRenderLogs(req, res);
        await new Promise((resolve) => setImmediate(resolve));

        assert.strictEqual(ackData.response_type, 'ephemeral');
        assert.match(ackData.text, /Fetching the latest 20 log lines/);
        assert.strictEqual(dispatched.length, 1);
        assert.strictEqual(dispatched[0].url, req.body.response_url);
      } finally {
        RenderLogsService.fetchLogs = originalFetchLogs;
        global.fetch = originalFetch;
      }
    });

    test('permits execution from any team and user when allowedTeamId and allowedUserIds are omitted', async () => {
      const originalFetch = global.fetch;
      const originalFetchLogs = RenderLogsService.fetchLogs;
      config.slack.allowedTeamId = null;
      config.slack.allowedUserIds = null;

      let ackData = null;
      const dispatched = [];
      const req = {
        body: {
          command: '/render-logs',
          channel_id: 'C12345678',
          team_id: 'T_ANY_TEAM',
          user_id: 'U_ANY_USER',
          response_url: 'https://hooks.slack.com/commands/any/url',
        },
      };
      const res = {
        status(code) {
          assert.strictEqual(code, 200);
          return this;
        },
        json(data) {
          ackData = data;
          return this;
        },
      };

      try {
        RenderLogsService.fetchLogs = async () => ({
          success: true,
          serviceId: 'srv-testservice',
          logs: [{ timestamp: '2026-09-26T10:00:00.000Z', message: 'background log line' }],
        });
        global.fetch = async (url, options) => {
          dispatched.push({ url, options });
          return { ok: true, status: 200 };
        };

        await SlackController.handleRenderLogs(req, res);
        await new Promise((resolve) => setImmediate(resolve));

        assert.strictEqual(ackData.response_type, 'ephemeral');
        assert.match(ackData.text, /Fetching the latest 30 log lines/);
        assert.strictEqual(dispatched.length, 1);
        assert.strictEqual(dispatched[0].url, req.body.response_url);
      } finally {
        RenderLogsService.fetchLogs = originalFetchLogs;
        global.fetch = originalFetch;
      }
    });

    test('blocks unauthorized user when allowedUserIds is explicitly configured', async () => {
      config.slack.allowedUserIds = ['U_AUTHORIZED_1', 'U_AUTHORIZED_2'];

      let responseData = null;
      const req = {
        body: {
          command: '/render-logs',
          channel_id: 'C12345678',
          team_id: 'T12345678',
          user_id: 'U_UNAUTHORIZED',
        },
      };
      const res = {
        status(code) {
          assert.strictEqual(code, 200);
          return this;
        },
        json(data) {
          responseData = data;
          return this;
        },
      };

      await SlackController.handleRenderLogs(req, res);
      assert.strictEqual(responseData.response_type, 'ephemeral');
      assert.match(responseData.blocks[1].text.text, /Your Slack user account is not authorized/);
    });
  });
});
