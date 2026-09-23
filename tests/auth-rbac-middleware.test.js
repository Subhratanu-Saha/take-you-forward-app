process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'auth-test-secret';

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const jwt = require('jsonwebtoken');

const config = require('../src/config');
const { ERROR_CODES } = require('../src/utils/db');
const { AUTH_ERROR_CODES } = require('../src/constants/constant');
const { authenticate } = require('../src/middleware/authMiddleware');
const { authorizeRoles, ROLES } = require('../src/middleware/rbacMiddleware');

describe('Auth & RBAC Authorization Middleware Engine (#188)', () => {
  describe('Constants and Error Codes Verification', () => {
    test('ERROR_CODES exports standardized auth error codes', () => {
      assert.equal(ERROR_CODES.AUTH_TOKEN_MISSING, 'AUTH_TOKEN_MISSING');
      assert.equal(ERROR_CODES.AUTH_TOKEN_INVALID, 'AUTH_TOKEN_INVALID');
      assert.equal(ERROR_CODES.FORBIDDEN_INSUFFICIENT_PERMISSIONS, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
      assert.equal(ERROR_CODES.UNAUTHORIZED, 'UNAUTHORIZED');
      assert.equal(ERROR_CODES.FORBIDDEN, 'FORBIDDEN');
    });

    test('AUTH_ERROR_CODES in constant.js exports standardized codes', () => {
      assert.equal(AUTH_ERROR_CODES.AUTH_TOKEN_MISSING, 'AUTH_TOKEN_MISSING');
      assert.equal(AUTH_ERROR_CODES.AUTH_TOKEN_INVALID, 'AUTH_TOKEN_INVALID');
      assert.equal(AUTH_ERROR_CODES.FORBIDDEN_INSUFFICIENT_PERMISSIONS, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    });

    test('ROLES object defines expected application roles', () => {
      assert.equal(ROLES.SUPER_ADMIN, 'SUPER_ADMIN');
      assert.equal(ROLES.STORE_MANAGER, 'STORE_MANAGER');
      assert.equal(ROLES.SUPPORT_AGENT, 'SUPPORT_AGENT');
      assert.equal(ROLES.AUDITOR, 'AUDITOR');
      assert.equal(ROLES.MARKETING_USER, 'MARKETING_USER');
    });
  });

  describe('Unit Testing: authenticate middleware', () => {
    const mockResponse = () => {
      const res = {};
      res.statusCode = 200;
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (body) => {
        res.body = body;
        return res;
      };
      return res;
    };

    test('rejects request with missing Authorization header', () => {
      const req = { headers: {} };
      const res = mockResponse();
      let nextCalled = false;

      authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.errorCode, 'AUTH_TOKEN_MISSING');
      assert.ok(res.body.message.includes('token is required'));
    });

    test('rejects request with non-Bearer Authorization header', () => {
      const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' } };
      const res = mockResponse();
      let nextCalled = false;

      authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.errorCode, 'AUTH_TOKEN_MISSING');
    });

    test('rejects request with Bearer prefix but empty token', () => {
      const req = { headers: { authorization: 'Bearer    ' } };
      const res = mockResponse();
      let nextCalled = false;

      authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.errorCode, 'AUTH_TOKEN_MISSING');
    });

    test('rejects expired JWT token with AUTH_TOKEN_INVALID', () => {
      const expiredToken = jwt.sign(
        { userId: 'USR-EXPIRED', role: 'SUPPORT_AGENT' },
        config.jwtSecret,
        { expiresIn: '-10s' }
      );
      const req = { headers: { authorization: `Bearer ${expiredToken}` } };
      const res = mockResponse();
      let nextCalled = false;

      authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.errorCode, 'AUTH_TOKEN_INVALID');
      assert.ok(res.body.message.toLowerCase().includes('expired'));
    });

    test('rejects tampered JWT signature with AUTH_TOKEN_INVALID', () => {
      const validToken = jwt.sign(
        { userId: 'USR-TAMPER', role: 'SUPER_ADMIN' },
        config.jwtSecret,
        { expiresIn: '1h' }
      );
      // Tamper signature by modifying the last characters
      const tamperedToken = validToken.slice(0, -6) + 'xxxxxx';
      const req = { headers: { authorization: `Bearer ${tamperedToken}` } };
      const res = mockResponse();
      let nextCalled = false;

      authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.errorCode, 'AUTH_TOKEN_INVALID');
      assert.ok(res.body.message.toLowerCase().includes('invalid'));
    });

    test('rejects token signed with wrong secret with AUTH_TOKEN_INVALID', () => {
      const badSecretToken = jwt.sign(
        { userId: 'USR-WRONG', role: 'STORE_MANAGER' },
        'wrong-secret-key-12345',
        { expiresIn: '1h' }
      );
      const req = { headers: { authorization: `Bearer ${badSecretToken}` } };
      const res = mockResponse();
      let nextCalled = false;

      authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.errorCode, 'AUTH_TOKEN_INVALID');
    });

    test('accepts valid JWT token and attaches user payload to req.user', () => {
      const userPayload = {
        userId: 'USR-VALID-101',
        email: 'user@example.com',
        role: 'STORE_MANAGER',
      };
      const validToken = jwt.sign(userPayload, config.jwtSecret, { expiresIn: '1h' });
      const req = { headers: { authorization: `Bearer ${validToken}` } };
      const res = mockResponse();
      let nextCalled = false;

      authenticate(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
      assert.ok(req.user);
      assert.equal(req.user.userId, 'USR-VALID-101');
      assert.equal(req.user.email, 'user@example.com');
      assert.equal(req.user.role, 'STORE_MANAGER');
      assert.equal(req.token, validToken);
      assert.equal(req.actor, 'USR-VALID-101');
    });
  });

  describe('Unit Testing: authorizeRoles middleware', () => {
    const mockResponse = () => {
      const res = {};
      res.statusCode = 200;
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.json = (body) => {
        res.body = body;
        return res;
      };
      return res;
    };

    test('rejects request when req.user is missing with 401 AUTH_TOKEN_MISSING', () => {
      const middleware = authorizeRoles('SUPER_ADMIN');
      const req = {};
      const res = mockResponse();
      let nextCalled = false;

      middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.errorCode, 'AUTH_TOKEN_MISSING');
    });

    test('rejects request when req.user has no role with 401 AUTH_TOKEN_MISSING', () => {
      const middleware = authorizeRoles('SUPER_ADMIN');
      const req = { user: { userId: 'USR-123' } };
      const res = mockResponse();
      let nextCalled = false;

      middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 401);
      assert.equal(res.body.success, false);
      assert.equal(res.body.errorCode, 'AUTH_TOKEN_MISSING');
    });

    test('blocks user lacking required role with 403 FORBIDDEN_INSUFFICIENT_PERMISSIONS', () => {
      const middleware = authorizeRoles('SUPER_ADMIN');
      const req = { user: { userId: 'USR-200', role: 'SUPPORT_AGENT' } };
      const res = mockResponse();
      let nextCalled = false;

      middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, false);
      assert.equal(res.statusCode, 403);
      assert.equal(res.body.success, false);
      assert.equal(res.body.errorCode, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
      assert.ok(res.body.message.includes('Insufficient permissions'));
    });

    test('allows user with matching role to proceed', () => {
      const middleware = authorizeRoles('SUPER_ADMIN');
      const req = { user: { userId: 'USR-201', role: 'SUPER_ADMIN' } };
      const res = mockResponse();
      let nextCalled = false;

      middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
    });

    test('allows user when role matches one of multiple allowed roles', () => {
      const middleware = authorizeRoles('SUPER_ADMIN', 'STORE_MANAGER');
      const req = { user: { userId: 'USR-202', role: 'STORE_MANAGER' } };
      const res = mockResponse();
      let nextCalled = false;

      middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
    });

    test('supports array of allowed roles and handles case-insensitivity', () => {
      const middleware = authorizeRoles(['super_admin', 'store_manager']);
      const req = { user: { userId: 'USR-203', role: 'STORE_MANAGER' } };
      const res = mockResponse();
      let nextCalled = false;

      middleware(req, res, () => { nextCalled = true; });

      assert.equal(nextCalled, true);
    });
  });

  describe('Express Integration: declarative route guards', () => {
    let server;
    let baseUrl;

    before(async () => {
      const app = express();
      app.use(express.json());

      // Public endpoint
      app.get('/api/test/public', (req, res) => {
        res.json({ success: true, message: 'public' });
      });

      // Authenticated endpoint (any valid token)
      app.get('/api/test/profile', authenticate, (req, res) => {
        res.json({ success: true, user: req.user });
      });

      // Role-guarded endpoint (SUPER_ADMIN only)
      app.get('/api/test/admin-only', authenticate, authorizeRoles(ROLES.SUPER_ADMIN), (req, res) => {
        res.json({ success: true, message: 'welcome admin' });
      });

      // Role-guarded endpoint (SUPER_ADMIN or STORE_MANAGER)
      app.post(
        '/api/test/inventory',
        authenticate,
        authorizeRoles(ROLES.SUPER_ADMIN, ROLES.STORE_MANAGER),
        (req, res) => {
          res.json({ success: true, message: 'inventory updated' });
        }
      );

      await new Promise((resolve) => {
        server = http.createServer(app);
        server.listen(0, () => {
          baseUrl = `http://localhost:${server.address().port}`;
          resolve();
        });
      });
    });

    after(async () => {
      if (server) {
        await new Promise((resolve) => server.close(resolve));
      }
    });

    test('401 on missing token adhering to standardized error structure', async () => {
      const res = await fetch(`${baseUrl}/api/test/profile`);
      const body = await res.json();

      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.errorCode, 'AUTH_TOKEN_MISSING');
      assert.ok(typeof body.message === 'string');
    });

    test('401 on expired token adhering to standardized error structure', async () => {
      const expiredToken = jwt.sign({ userId: 'U1', role: 'SUPPORT_AGENT' }, config.jwtSecret, { expiresIn: '-5s' });
      const res = await fetch(`${baseUrl}/api/test/profile`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      const body = await res.json();

      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.errorCode, 'AUTH_TOKEN_INVALID');
      assert.ok(body.message.toLowerCase().includes('expired'));
    });

    test('401 on tampered token signature adhering to standardized error structure', async () => {
      const valid = jwt.sign({ userId: 'U2', role: 'SUPER_ADMIN' }, config.jwtSecret, { expiresIn: '1h' });
      const tampered = valid.slice(0, -5) + 'AAAAA';
      const res = await fetch(`${baseUrl}/api/test/profile`, {
        headers: { Authorization: `Bearer ${tampered}` },
      });
      const body = await res.json();

      assert.equal(res.status, 401);
      assert.equal(body.success, false);
      assert.equal(body.errorCode, 'AUTH_TOKEN_INVALID');
    });

    test('200 on valid token attaching payload to req.user', async () => {
      const token = jwt.sign({ userId: 'USER-SUCCESS', role: 'SUPPORT_AGENT', email: 'agent@tayf.test' }, config.jwtSecret, { expiresIn: '1h' });
      const res = await fetch(`${baseUrl}/api/test/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.user.userId, 'USER-SUCCESS');
      assert.equal(body.user.role, 'SUPPORT_AGENT');
      assert.equal(body.user.email, 'agent@tayf.test');
    });

    test('403 on insufficient role for admin-only endpoint', async () => {
      const agentToken = jwt.sign({ userId: 'USER-AGENT', role: 'SUPPORT_AGENT' }, config.jwtSecret, { expiresIn: '1h' });
      const res = await fetch(`${baseUrl}/api/test/admin-only`, {
        headers: { Authorization: `Bearer ${agentToken}` },
      });
      const body = await res.json();

      assert.equal(res.status, 403);
      assert.equal(body.success, false);
      assert.equal(body.errorCode, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
      assert.ok(body.message.includes('Insufficient permissions for role'));
    });

    test('200 on authorized role for admin-only endpoint', async () => {
      const adminToken = jwt.sign({ userId: 'USER-ADMIN', role: 'SUPER_ADMIN' }, config.jwtSecret, { expiresIn: '1h' });
      const res = await fetch(`${baseUrl}/api/test/admin-only`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const body = await res.json();

      assert.equal(res.status, 200);
      assert.equal(body.success, true);
      assert.equal(body.message, 'welcome admin');
    });

    test('200 on multi-role endpoint for STORE_MANAGER and SUPER_ADMIN, 403 for SUPPORT_AGENT', async () => {
      const managerToken = jwt.sign({ userId: 'USER-MGR', role: 'STORE_MANAGER' }, config.jwtSecret, { expiresIn: '1h' });
      const adminToken = jwt.sign({ userId: 'USER-ADM', role: 'SUPER_ADMIN' }, config.jwtSecret, { expiresIn: '1h' });
      const agentToken = jwt.sign({ userId: 'USER-AGT', role: 'SUPPORT_AGENT' }, config.jwtSecret, { expiresIn: '1h' });

      // STORE_MANAGER passes
      const mgrRes = await fetch(`${baseUrl}/api/test/inventory`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${managerToken}`, 'Content-Type': 'application/json' },
      });
      assert.equal(mgrRes.status, 200);

      // SUPER_ADMIN passes
      const admRes = await fetch(`${baseUrl}/api/test/inventory`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
      });
      assert.equal(admRes.status, 200);

      // SUPPORT_AGENT blocked with 403
      const agtRes = await fetch(`${baseUrl}/api/test/inventory`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${agentToken}`, 'Content-Type': 'application/json' },
      });
      const agtBody = await agtRes.json();
      assert.equal(agtRes.status, 403);
      assert.equal(agtBody.errorCode, 'FORBIDDEN_INSUFFICIENT_PERMISSIONS');
    });
  });
});
