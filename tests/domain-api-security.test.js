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

describe('Domain API Security Guards (#190)', () => {
  let server;
  let baseUrl;

  before(async () => {
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
  });

  describe('Unauthenticated Requests (401 Unauthorized)', () => {
    test('GET /api/v1/customers returns 401 when no token provided', async () => {
      const res = await fetch(`${baseUrl}/api/v1/customers`);
      const body = await res.json();

      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.ok(['AUTH_TOKEN_MISSING', 'UNAUTHORIZED'].includes(body.errorCode));
    });

    test('POST /api/v1/customers returns 401 when no token provided', async () => {
      const res = await fetch(`${baseUrl}/api/v1/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstname: 'Test' }),
      });
      const body = await res.json();

      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.ok(['AUTH_TOKEN_MISSING', 'UNAUTHORIZED'].includes(body.errorCode));
    });

    test('GET /api/v1/orders returns 401 when no token provided', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders`);
      const body = await res.json();

      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.ok(['AUTH_TOKEN_MISSING', 'UNAUTHORIZED'].includes(body.errorCode));
    });

    test('POST /api/v1/orders returns 401 when no token provided', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await res.json();

      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.ok(['AUTH_TOKEN_MISSING', 'UNAUTHORIZED'].includes(body.errorCode));
    });

    test('GET /api/v1/loyalty/:customerId returns 401 when no token provided', async () => {
      const res = await fetch(`${baseUrl}/api/v1/loyalty/CUST-1750000000000-ABC123`);
      const body = await res.json();

      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.ok(['AUTH_TOKEN_MISSING', 'UNAUTHORIZED'].includes(body.errorCode));
    });

    test('PUT /api/v1/loyalty/:customerId returns 401 when no token provided', async () => {
      const res = await fetch(`${baseUrl}/api/v1/loyalty/CUST-1750000000000-ABC123`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalpoints: 100 }),
      });
      const body = await res.json();

      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.ok(['AUTH_TOKEN_MISSING', 'UNAUTHORIZED'].includes(body.errorCode));
    });
  });

  describe('Unauthorized Role Requests (403 Forbidden)', () => {
    test('GET /api/v1/customers returns 403 for CUSTOMER role', async () => {
      const res = await fetch(`${baseUrl}/api/v1/customers`, {
        headers: { Authorization: 'Bearer CUSTOMER' },
      });
      const body = await res.json();

      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(['FORBIDDEN_INSUFFICIENT_PERMISSIONS', 'FORBIDDEN'].includes(body.errorCode));
    });

    test('GET /api/v1/orders returns 403 for CUSTOMER role', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders`, {
        headers: { Authorization: 'Bearer CUSTOMER' },
      });
      const body = await res.json();

      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(['FORBIDDEN_INSUFFICIENT_PERMISSIONS', 'FORBIDDEN'].includes(body.errorCode));
    });

    test('POST /api/v1/orders returns 403 for SUPPORT_AGENT role (creation requires SUPER_ADMIN or STORE_MANAGER)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer SUPPORT_AGENT',
        },
        body: JSON.stringify({}),
      });
      const body = await res.json();

      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(['FORBIDDEN_INSUFFICIENT_PERMISSIONS', 'FORBIDDEN'].includes(body.errorCode));
    });

    test('PUT /api/v1/orders/:id returns 403 for SUPPORT_AGENT role (updates require SUPER_ADMIN or STORE_MANAGER)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders/ORD-12345`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer SUPPORT_AGENT',
        },
        body: JSON.stringify({ taxamount: 10 }),
      });
      const body = await res.json();

      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(['FORBIDDEN_INSUFFICIENT_PERMISSIONS', 'FORBIDDEN'].includes(body.errorCode));
    });

    test('PUT /api/v1/loyalty/:id returns 403 for SUPPORT_AGENT role (points adjustment requires SUPER_ADMIN or STORE_MANAGER)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/loyalty/CUST-1750000000000-ABC123`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer SUPPORT_AGENT',
        },
        body: JSON.stringify({ totalpoints: 500 }),
      });
      const body = await res.json();

      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.ok(['FORBIDDEN_INSUFFICIENT_PERMISSIONS', 'FORBIDDEN'].includes(body.errorCode));
    });
  });

  describe('Authorized Roles Access', () => {
    test('SUPPORT_AGENT passes auth guards on /api/v1/customers', async () => {
      const origFindMany = prisma.customer.findMany;
      const origCount = prisma.customer.count;
      try {
        prisma.customer.findMany = async () => [];
        prisma.customer.count = async () => 0;

        const res = await fetch(`${baseUrl}/api/v1/customers`, {
          headers: { Authorization: 'Bearer SUPPORT_AGENT' },
        });

        // Passes guard, reaches controller
        assert.equal(res.status, 200);
      } finally {
        prisma.customer.findMany = origFindMany;
        prisma.customer.count = origCount;
      }
    });

    test('STORE_MANAGER passes auth guards on /api/v1/customers', async () => {
      const origFindMany = prisma.customer.findMany;
      const origCount = prisma.customer.count;
      try {
        prisma.customer.findMany = async () => [];
        prisma.customer.count = async () => 0;

        const res = await fetch(`${baseUrl}/api/v1/customers`, {
          headers: { Authorization: 'Bearer STORE_MANAGER' },
        });

        assert.equal(res.status, 200);
      } finally {
        prisma.customer.findMany = origFindMany;
        prisma.customer.count = origCount;
      }
    });

    test('SUPER_ADMIN passes auth guards on /api/v1/customers', async () => {
      const origFindMany = prisma.customer.findMany;
      const origCount = prisma.customer.count;
      try {
        prisma.customer.findMany = async () => [];
        prisma.customer.count = async () => 0;

        const res = await fetch(`${baseUrl}/api/v1/customers`, {
          headers: { Authorization: 'Bearer SUPER_ADMIN' },
        });

        assert.equal(res.status, 200);
      } finally {
        prisma.customer.findMany = origFindMany;
        prisma.customer.count = origCount;
      }
    });

    test('STORE_MANAGER passes auth guards on order creation and updates', async () => {
      // Send invalid payload to test that request passed auth and reached validator
      const res = await fetch(`${baseUrl}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer STORE_MANAGER',
        },
        body: JSON.stringify({}),
      });

      // Status should be 400 validation error, not 401 or 403
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.notEqual(body.errorCode, 'UNAUTHORIZED');
      assert.notEqual(body.errorCode, 'FORBIDDEN');
    });

    test('SUPER_ADMIN passes auth guards on order creation and updates', async () => {
      const res = await fetch(`${baseUrl}/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer SUPER_ADMIN',
        },
        body: JSON.stringify({}),
      });

      assert.equal(res.status, 400);
      const body = await res.json();
      assert.notEqual(body.errorCode, 'UNAUTHORIZED');
      assert.notEqual(body.errorCode, 'FORBIDDEN');
    });

    test('STORE_MANAGER passes auth guards on loyalty updates', async () => {
      const res = await fetch(`${baseUrl}/api/v1/loyalty/INVALID-CUST`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer STORE_MANAGER',
        },
        body: JSON.stringify({ totalpoints: 100 }),
      });

      // Reached controller/validator (invalid customer ID format -> 400)
      assert.equal(res.status, 400);
      const body = await res.json();
      assert.notEqual(body.errorCode, 'UNAUTHORIZED');
      assert.notEqual(body.errorCode, 'FORBIDDEN');
    });
  });

  describe('Flexible Token / Header Format Parsing', () => {
    test('accepts mock-token-super_admin format', async () => {
      const origFindMany = prisma.customer.findMany;
      const origCount = prisma.customer.count;
      try {
        prisma.customer.findMany = async () => [];
        prisma.customer.count = async () => 0;

        const res = await fetch(`${baseUrl}/api/v1/customers`, {
          headers: { Authorization: 'Bearer mock-token-super_admin' },
        });

        assert.equal(res.status, 200);
      } finally {
        prisma.customer.findMany = origFindMany;
        prisma.customer.count = origCount;
      }
    });

    test('accepts base64 JWT payload with role', async () => {
      const origFindMany = prisma.customer.findMany;
      const origCount = prisma.customer.count;
      try {
        prisma.customer.findMany = async () => [];
        prisma.customer.count = async () => 0;

        const payload = Buffer.from(JSON.stringify({ role: 'STORE_MANAGER', id: 'MGR-1' })).toString('base64');
        const jwt = `header.${payload}.signature`;

        const res = await fetch(`${baseUrl}/api/v1/customers`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });

        assert.equal(res.status, 200);
      } finally {
        prisma.customer.findMany = origFindMany;
        prisma.customer.count = origCount;
      }
    });

    test('accepts x-user-role header with valid bearer token', async () => {
      const origFindMany = prisma.customer.findMany;
      const origCount = prisma.customer.count;
      try {
        prisma.customer.findMany = async () => [];
        prisma.customer.count = async () => 0;

        const res = await fetch(`${baseUrl}/api/v1/customers`, {
          headers: {
            Authorization: 'Bearer test-token-123',
            'x-user-role': 'SUPPORT_AGENT',
          },
        });

        assert.equal(res.status, 200);
      } finally {
        prisma.customer.findMany = origFindMany;
        prisma.customer.count = origCount;
      }
    });
  });
});
