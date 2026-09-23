const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.EMAIL_USER_ID = process.env.EMAIL_USER_ID || 'test@example.com';
process.env.EMAIL_USER_PASSCODE = process.env.EMAIL_USER_PASSCODE || 'test-app-password';

const nodemailer = require('nodemailer');
const originalCreateTransport = nodemailer.createTransport;
nodemailer.createTransport = (...args) => {
  const transport = originalCreateTransport(...args);
  transport.verify = async () => true;
  return transport;
};

const app = require('../src/app');
const prisma = require('../src/utils/db');

describe('Audit API Security Guards (#TUF-0192)', () => {
  let server;
  let baseUrl;

  before(async () => {
    await prisma.$connect();
    await new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  });

  describe('Unauthenticated Access (401 Unauthorized)', () => {
    test('GET /api/v1/audit-logs returns 401 without token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs`);
      const body = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.errorCode, 'AUTH_TOKEN_MISSING');
    });

    test('GET /api/v1/audit-logs/stats returns 401 without token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/stats`);
      const body = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.errorCode, 'AUTH_TOKEN_MISSING');
    });

    test('GET /api/v1/audit-logs/export returns 401 without token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/export`);
      const body = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.errorCode, 'AUTH_TOKEN_MISSING');
    });

    test('GET /api/v1/audit-logs/request/:requestId returns 401 without token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/request/REQ-999`);
      const body = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.errorCode, 'AUTH_TOKEN_MISSING');
    });

    test('GET /api/v1/audit-logs/:auditId returns 401 without token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/invalid-id`);
      const body = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.errorCode, 'AUTH_TOKEN_MISSING');
    });

    test('GET /api/v1/audit-logs returns 401 with invalid/malformed token', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs`, {
        headers: { Authorization: 'Bearer invalid.token.payload' },
      });
      const body = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.errorCode, 'AUTH_TOKEN_INVALID');
    });
  });

  describe('Unauthorized Roles Access (403 Forbidden)', () => {
    test('STORE_MANAGER is forbidden from accessing audit logs', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs`, {
        headers: { Authorization: 'Bearer STORE_MANAGER' },
      });
      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.errorCode, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    });

    test('SUPPORT_AGENT is forbidden from accessing audit stats', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/stats`, {
        headers: { Authorization: 'Bearer SUPPORT_AGENT' },
      });
      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.errorCode, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    });

    test('MARKETING_USER is forbidden from exporting audit logs', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/export`, {
        headers: { Authorization: 'Bearer MARKETING_USER' },
      });
      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.errorCode, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    });

    test('STORE_MANAGER is forbidden from request correlation tracer', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/request/REQ-999`, {
        headers: { Authorization: 'Bearer STORE_MANAGER' },
      });
      const body = await res.json();
      assert.strictEqual(res.status, 403);
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.errorCode, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('Authorized Roles Access (SUPER_ADMIN and AUDITOR)', () => {
    test('SUPER_ADMIN can access audit activity list', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs`, {
        headers: { Authorization: 'Bearer SUPER_ADMIN' },
      });
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
    });

    test('SUPER_ADMIN can access audit stats', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/stats`, {
        headers: { Authorization: 'Bearer SUPER_ADMIN' },
      });
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
    });

    test('AUDITOR can access audit activity list', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs`, {
        headers: { Authorization: 'Bearer AUDITOR' },
      });
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
    });

    test('AUDITOR can access audit stats', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/stats`, {
        headers: { Authorization: 'Bearer AUDITOR' },
      });
      const body = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(body.success, true);
    });

    test('AUDITOR can export audit logs as CSV', async () => {
      const res = await fetch(`${baseUrl}/api/v1/audit-logs/export`, {
        headers: { Authorization: 'Bearer AUDITOR' },
      });
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type')?.includes('text/csv'));
    });
  });
});
