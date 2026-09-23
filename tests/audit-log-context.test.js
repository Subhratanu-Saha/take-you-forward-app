process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-123';

const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const app = require('../src/app');
const {
  getRequestContext,
  runWithContext,
  getRequestId,
  getActor,
  getUserRole,
  getIpAddress,
} = require('../src/context/requestContext');
const contextMiddleware = require('../src/middleware/contextMiddleware');
const {
  calculateDiff,
  recordAuditLog,
  getAuditLogsByEntity,
} = require('../src/services/auditService');
const { attachAuditExtension } = require('../src/db/prisma');

test('Audit Service - calculateDiff correctly detects field changes and ignores timestamps', () => {
  const oldCustomer = {
    customerid: 'CUST-1',
    firstname: 'John',
    lastname: 'Doe',
    emailadd: 'john@example.com',
    contactnum: '1234567890',
    city: 'New York',
    pincode: '10001',
    isloyalty: false,
    syslastmodifieddt: new Date('2026-01-01T00:00:00Z'),
    updatedat: new Date('2026-01-01T00:00:00Z'),
  };

  const newCustomer = {
    customerid: 'CUST-1',
    firstname: 'Johnny', // Changed
    lastname: 'Doe',     // Unchanged
    emailadd: 'johnny@example.com', // Changed
    contactnum: '1234567890',
    city: 'San Francisco', // Changed
    pincode: '94105',     // Changed
    isloyalty: true,      // Changed
    syslastmodifieddt: new Date('2026-02-01T00:00:00Z'), // Ignored timestamp
    updatedat: new Date('2026-02-01T00:00:00Z'),         // Ignored timestamp
  };

  const diff = calculateDiff(oldCustomer, newCustomer);

  assert.deepEqual(diff.changedfields.sort(), ['city', 'emailadd', 'firstname', 'isloyalty', 'pincode'].sort());
  assert.equal(diff.oldvalues.firstname, 'John');
  assert.equal(diff.newvalues.firstname, 'Johnny');
  assert.equal(diff.oldvalues.city, 'New York');
  assert.equal(diff.newvalues.city, 'San Francisco');
  assert.equal(diff.oldvalues.isloyalty, false);
  assert.equal(diff.newvalues.isloyalty, true);
  assert.equal(diff.oldvalues.syslastmodifieddt, undefined);
  assert.equal(diff.newvalues.updatedat, undefined);
});

test('Audit Service - calculateDiff handles Dates, Decimals, and returns empty diff on identical objects', () => {
  const mockDecimal = (val) => ({
    val,
    toString: () => String(val),
    equals: (other) => String(val) === (other?.val !== undefined ? String(other.val) : String(other)),
    constructor: { name: 'Decimal' },
  });

  const state1 = {
    orderid: 'ORD-100',
    totalamount: mockDecimal(50.00),
    dob: new Date('1990-05-15T00:00:00.000Z'),
  };

  const state2 = {
    orderid: 'ORD-100',
    totalamount: mockDecimal(50.00),
    dob: new Date('1990-05-15T00:00:00.000Z'),
  };

  const noDiff = calculateDiff(state1, state2);
  assert.equal(noDiff.changedfields.length, 0);
  assert.deepEqual(noDiff.oldvalues, {});
  assert.deepEqual(noDiff.newvalues, {});

  const state3 = {
    orderid: 'ORD-100',
    totalamount: mockDecimal(99.99),
    dob: new Date('1995-01-01T00:00:00.000Z'),
  };

  const diffWithDecimalAndDate = calculateDiff(state1, state3);
  assert.deepEqual(diffWithDecimalAndDate.changedfields.sort(), ['dob', 'totalamount'].sort());
  assert.equal(diffWithDecimalAndDate.oldvalues.totalamount, '50');
  assert.equal(diffWithDecimalAndDate.newvalues.totalamount, '99.99');
  assert.equal(diffWithDecimalAndDate.oldvalues.dob, '1990-05-15T00:00:00.000Z');
  assert.equal(diffWithDecimalAndDate.newvalues.dob, '1995-01-01T00:00:00.000Z');
});

test('Request Context - getRequestContext returns defaults outside context and propagates inside runWithContext', () => {
  const defaultCtx = getRequestContext();
  assert.equal(defaultCtx.requestId, null);
  assert.equal(defaultCtx.actor, 'ANONYMOUS');
  assert.equal(defaultCtx.userRole, null);
  assert.equal(defaultCtx.ipAddress, null);
  assert.equal(getUserRole(), null);

  const customContext = {
    requestId: 'REQ-AUDIT-12345',
    actor: 'USER-ADMIN-99',
    userRole: 'COMPLIANCE_OFFICER',
    ipAddress: '192.168.1.100',
  };

  runWithContext(customContext, () => {
    const activeCtx = getRequestContext();
    assert.equal(activeCtx.requestId, 'REQ-AUDIT-12345');
    assert.equal(activeCtx.actor, 'USER-ADMIN-99');
    assert.equal(activeCtx.userRole, 'COMPLIANCE_OFFICER');
    assert.equal(activeCtx.ipAddress, '192.168.1.100');

    assert.equal(getRequestId(), 'REQ-AUDIT-12345');
    assert.equal(getActor(), 'USER-ADMIN-99');
    assert.equal(getUserRole(), 'COMPLIANCE_OFFICER');
    assert.equal(getIpAddress(), '192.168.1.100');
  });

  // Reverts to default outside
  assert.equal(getRequestId(), null);
  assert.equal(getActor(), 'ANONYMOUS');
  assert.equal(getUserRole(), null);
});

test('Context Middleware - extracts authenticated user ID and role from req.user', (t, done) => {
  const req = {
    headers: {
      'x-request-id': 'REQ-AUTH-TEST-100',
    },
    user: {
      id: 'USER-STAFF-42',
      role: 'SUPER_ADMIN',
    },
    method: 'POST',
    originalUrl: '/api/v1/customers',
  };

  const res = {
    headers: {},
    setHeader(name, val) {
      this.headers[name] = val;
    },
  };

  contextMiddleware(req, res, () => {
    assert.equal(req.requestId, 'REQ-AUTH-TEST-100');
    assert.equal(req.actor, 'USER-STAFF-42');
    assert.equal(req.userRole, 'SUPER_ADMIN');
    assert.equal(res.headers['X-Request-Id'], 'REQ-AUTH-TEST-100');

    const activeCtx = getRequestContext();
    assert.equal(activeCtx.requestId, 'REQ-AUTH-TEST-100');
    assert.equal(activeCtx.actor, 'USER-STAFF-42');
    assert.equal(activeCtx.userRole, 'SUPER_ADMIN');
    assert.equal(getUserRole(), 'SUPER_ADMIN');
    assert.equal(getActor(), 'USER-STAFF-42');
    done();
  });
});

test('Context Middleware - dynamically resolves req.user when attached downstream', (t, done) => {
  const req = {
    headers: {
      'x-request-id': 'REQ-DOWNSTREAM-200',
    },
    method: 'PATCH',
    originalUrl: '/api/v1/orders/ORD-500',
  };

  const res = {
    headers: {},
    setHeader(name, val) {
      this.headers[name] = val;
    },
  };

  contextMiddleware(req, res, () => {
    const initialCtx = getRequestContext();
    assert.equal(initialCtx.actor, 'ANONYMOUS');
    assert.equal(initialCtx.userRole, null);

    // Simulate route-level authentication middleware attaching req.user downstream
    req.user = {
      id: 'DOWNSTREAM-USER-99',
      role: 'STORE_MANAGER',
    };

    assert.equal(req.actor, 'DOWNSTREAM-USER-99');
    assert.equal(req.userRole, 'STORE_MANAGER');

    const updatedCtx = getRequestContext();
    assert.equal(updatedCtx.actor, 'DOWNSTREAM-USER-99');
    assert.equal(updatedCtx.userRole, 'STORE_MANAGER');
    assert.equal(getActor(), 'DOWNSTREAM-USER-99');
    assert.equal(getUserRole(), 'STORE_MANAGER');
    done();
  });
});

test('Audit Service - automatically populates actor, createdby, and metadata.userRole from RequestContext', async () => {
  const createdLogs = [];
  const mockPrisma = {
    auditlog: {
      create: async ({ data }) => {
        createdLogs.push(data);
        return { auditid: 'AUD-TEST-1', ...data };
      },
    },
  };

  const authenticatedContext = {
    requestId: 'REQ-CTX-AUDIT-555',
    actor: 'USER-COMPLIANCE-77',
    userRole: 'COMPLIANCE_LEAD',
    ipAddress: '10.20.30.40',
  };

  await runWithContext(authenticatedContext, async () => {
    // Call recordAuditLog WITHOUT passing actor, createdby, or metadata.userRole
    const result = await recordAuditLog(mockPrisma, {
      entityType: 'CUSTOMER',
      entityId: 'CUST-555',
      action: 'UPDATE',
      customerId: 'CUST-555',
      changedFields: ['contactnum'],
      oldValue: { contactnum: '1111111111' },
      newValue: { contactnum: '2222222222' },
    });

    assert.ok(result);
  });

  assert.equal(createdLogs.length, 1);
  const log = createdLogs[0];

  assert.equal(log.actor, 'USER-COMPLIANCE-77', 'actor should automatically be set from ctx.actor');
  assert.equal(log.createdby, 'USER-COMPLIANCE-77', 'createdby should automatically be set from ctx.actor');
  assert.equal(log.createdby_type, 'USER', 'createdby_type should be USER for authenticated actors');
  assert.equal(log.requestid, 'REQ-CTX-AUDIT-555');
  assert.equal(log.ipaddress, '10.20.30.40');

  // Verify metadata object
  assert.ok(log.metadata, 'metadata must be populated');
  assert.equal(log.metadata.actor, 'USER-COMPLIANCE-77');
  assert.equal(log.metadata.userRole, 'COMPLIANCE_LEAD', 'metadata.userRole must be automatically populated from ctx.userRole');
  assert.equal(log.metadata.requestid, 'REQ-CTX-AUDIT-555');
  assert.equal(log.metadata.ipaddress, '10.20.30.40');
});

test('Prisma Change-Capture Engine - records audit logs with authenticated actor across Customer, Order, and Loyalty operations', async () => {
  const auditLogsCreated = [];

  // Mock Prisma client with $extends mechanism supporting Customer, Order, and Loyalty
  const mockBaseClient = {
    customer: {
      findUnique: async ({ where }) => ({
        customerid: where.customerid,
        firstname: 'OriginalCustomer',
      }),
    },
    orderheader: {
      findUnique: async ({ where }) => ({
        orderid: where.orderid,
        customerid: 'CUST-ORDER-1',
        totalamount: 100.0,
      }),
    },
    loyalty: {
      findUnique: async ({ where }) => ({
        loyaltyid: where.loyaltyid,
        customerid: 'CUST-LOY-1',
        tier: 'BRONZE',
        totalpoints: 50,
      }),
    },
    auditlog: {
      create: async ({ data }) => {
        auditLogsCreated.push(data);
        return { auditlogid: `AUD-${auditLogsCreated.length}`, ...data };
      },
      findMany: async ({ where }) => {
        return auditLogsCreated.filter((log) => {
          const matchesEntity = where.OR
            ? where.OR.some(
                (cond) =>
                  (cond.entitytype && log.entitytype === cond.entitytype) ||
                  (cond.entityname && log.entityname === cond.entityname)
              )
            : log.entitytype === where.entitytype || log.entityname === where.entitytype;
          return matchesEntity && log.entityid === where.entityid;
        });
      },
    },
    $extends(extensionConfig) {
      const client = { ...this };
      const modelExtension = extensionConfig.query.$allModels;

      client.customer = {
        ...client.customer,
        update: async (args) => {
          const oldState = await mockBaseClient.customer.findUnique({ where: args.where });
          return modelExtension.update({
            model: 'customer',
            operation: 'update',
            args,
            query: async (queryArgs) => ({
              ...oldState,
              customerid: queryArgs.where.customerid,
              ...queryArgs.data,
            }),
          });
        },
      };

      client.orderheader = {
        ...client.orderheader,
        update: async (args) => {
          const oldState = await mockBaseClient.orderheader.findUnique({ where: args.where });
          return modelExtension.update({
            model: 'orderheader',
            operation: 'update',
            args,
            query: async (queryArgs) => ({
              ...oldState,
              orderid: queryArgs.where.orderid,
              ...queryArgs.data,
            }),
          });
        },
      };

      client.loyalty = {
        ...client.loyalty,
        update: async (args) => {
          const oldState = await mockBaseClient.loyalty.findUnique({ where: args.where });
          return modelExtension.update({
            model: 'loyalty',
            operation: 'update',
            args,
            query: async (queryArgs) => ({
              ...oldState,
              loyaltyid: queryArgs.where.loyaltyid,
              ...queryArgs.data,
            }),
          });
        },
      };

      return client;
    },
  };

  const extendedClient = attachAuditExtension(mockBaseClient);

  const staffContext = {
    requestId: 'REQ-STAFF-OP-888',
    actor: 'USER-STAFF-OPERATOR',
    userRole: 'COMPLIANCE_AUDITOR',
    ipAddress: '192.168.10.50',
  };

  await runWithContext(staffContext, async () => {
    // 1. Customer Operation
    await extendedClient.customer.update({
      where: { customerid: 'CUST-100' },
      data: { firstname: 'UpdatedCustomer' },
    });

    // 2. Order Operation
    await extendedClient.orderheader.update({
      where: { orderid: 'ORD-200' },
      data: { totalamount: 150.0 },
    });

    // 3. Loyalty Operation
    await extendedClient.loyalty.update({
      where: { loyaltyid: 300 },
      data: { tier: 'SILVER', totalpoints: 250 },
    });
  });

  assert.equal(auditLogsCreated.length, 3, 'Audit logs must be created for Customer, Order, and Loyalty');

  // Verify Customer Audit Log
  const customerLog = auditLogsCreated.find((l) => l.entityname === 'CUSTOMER');
  assert.ok(customerLog);
  assert.equal(customerLog.actor, 'USER-STAFF-OPERATOR');
  assert.equal(customerLog.createdby, 'USER-STAFF-OPERATOR');
  assert.equal(customerLog.createdby_type, 'USER');
  assert.equal(customerLog.metadata.userRole, 'COMPLIANCE_AUDITOR');
  assert.equal(customerLog.metadata.actor, 'USER-STAFF-OPERATOR');
  assert.equal(customerLog.requestid, 'REQ-STAFF-OP-888');

  // Verify Order Audit Log
  const orderLog = auditLogsCreated.find((l) => l.entityname === 'ORDER');
  assert.ok(orderLog);
  assert.equal(orderLog.actor, 'USER-STAFF-OPERATOR');
  assert.equal(orderLog.createdby, 'USER-STAFF-OPERATOR');
  assert.equal(orderLog.createdby_type, 'USER');
  assert.equal(orderLog.metadata.userRole, 'COMPLIANCE_AUDITOR');
  assert.equal(orderLog.metadata.actor, 'USER-STAFF-OPERATOR');
  assert.equal(orderLog.requestid, 'REQ-STAFF-OP-888');

  // Verify Loyalty Audit Log
  const loyaltyLog = auditLogsCreated.find((l) => l.entityname === 'LOYALTY');
  assert.ok(loyaltyLog);
  assert.equal(loyaltyLog.actor, 'USER-STAFF-OPERATOR');
  assert.equal(loyaltyLog.createdby, 'USER-STAFF-OPERATOR');
  assert.equal(loyaltyLog.createdby_type, 'USER');
  assert.equal(loyaltyLog.metadata.userRole, 'COMPLIANCE_AUDITOR');
  assert.equal(loyaltyLog.metadata.actor, 'USER-STAFF-OPERATOR');
  assert.equal(loyaltyLog.requestid, 'REQ-STAFF-OP-888');
});

test('Context Propagation - remains non-blocking and isolated across concurrent async operations', async () => {
  const runWorker = async (actorId, role, delayMs) => {
    const ctx = {
      requestId: `REQ-${actorId}`,
      actor: actorId,
      userRole: role,
      ipAddress: '127.0.0.1',
    };

    return runWithContext(ctx, async () => {
      // Non-blocking timer delay
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Verify context maintained without cross-talk
      const current = getRequestContext();
      assert.equal(current.actor, actorId);
      assert.equal(current.userRole, role);
      assert.equal(getActor(), actorId);
      assert.equal(getUserRole(), role);
      return { actor: current.actor, role: current.userRole };
    });
  };

  const results = await Promise.all([
    runWorker('USER-A', 'ROLE-ADMIN', 30),
    runWorker('USER-B', 'ROLE-MANAGER', 10),
    runWorker('USER-C', 'ROLE-AUDITOR', 20),
  ]);

  assert.deepEqual(results, [
    { actor: 'USER-A', role: 'ROLE-ADMIN' },
    { actor: 'USER-B', role: 'ROLE-MANAGER' },
    { actor: 'USER-C', role: 'ROLE-AUDITOR' },
  ]);
});

test('End-to-End JWT Pipeline - resolves signed token and propagates user identity to RequestContext and Audit Logs', async () => {
  const secret = config.jwtSecret || process.env.JWT_SECRET || 'test-jwt-secret-key-123';
  const signedToken = jwt.sign(
    {
      userId: 'JWT-STAFF-007',
      email: 'officer7@tuf-retail.com',
      role: 'SUPER_ADMIN',
    },
    secret,
    { expiresIn: '1h' }
  );

  const server = app.listen(0);
  const port = server.address().port;

  try {
    const resp = await fetch(`http://localhost:${port}/api/health`, {
      headers: {
        Authorization: `Bearer ${signedToken}`,
        'X-Request-Id': 'REQ-E2E-JWT-TEST-99',
      },
    });

    assert.equal(resp.status, 200);
    const body = await resp.json();
    assert.equal(body.success, true);
    assert.equal(body.actor, 'JWT-STAFF-007');
    assert.equal(body.userRole, 'SUPER_ADMIN');
    assert.equal(body.requestId, 'REQ-E2E-JWT-TEST-99');
    assert.equal(resp.headers.get('x-request-id'), 'REQ-E2E-JWT-TEST-99');

    // Also verify audit log record creation with this context
    const mockDb = {
      auditlog: {
        create: async ({ data }) => data,
      },
    };

    const activeContext = {
      requestId: body.requestId,
      actor: body.actor,
      userRole: body.userRole,
      ipAddress: '127.0.0.1',
    };

    await runWithContext(activeContext, async () => {
      const auditEntry = await recordAuditLog(mockDb, {
        entityType: 'CUSTOMER',
        entityId: 'CUST-E2E-1',
        action: 'UPDATE',
        changedFields: ['firstname'],
        oldValue: { firstname: 'Old' },
        newValue: { firstname: 'New' },
      });

      assert.equal(auditEntry.actor, 'JWT-STAFF-007');
      assert.equal(auditEntry.createdby, 'JWT-STAFF-007');
      assert.equal(auditEntry.createdby_type, 'USER');
      assert.equal(auditEntry.metadata.userRole, 'SUPER_ADMIN');
      assert.equal(auditEntry.metadata.actor, 'JWT-STAFF-007');
      assert.equal(auditEntry.requestid, 'REQ-E2E-JWT-TEST-99');
    });
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
