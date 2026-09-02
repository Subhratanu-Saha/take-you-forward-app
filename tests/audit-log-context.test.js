const test = require('node:test');
const assert = require('node:assert/strict');
const { getRequestContext, runWithContext, getRequestId, getActor, getIpAddress } = require('../src/context/requestContext');
const contextMiddleware = require('../src/middleware/contextMiddleware');
const { calculateDiff, getAuditLogsByEntity } = require('../src/services/auditService');
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
  assert.equal(defaultCtx.ipAddress, null);

  const customContext = {
    requestId: 'REQ-AUDIT-12345',
    actor: 'USER-ADMIN-99',
    ipAddress: '192.168.1.100',
  };

  runWithContext(customContext, () => {
    const activeCtx = getRequestContext();
    assert.equal(activeCtx.requestId, 'REQ-AUDIT-12345');
    assert.equal(activeCtx.actor, 'USER-ADMIN-99');
    assert.equal(activeCtx.ipAddress, '192.168.1.100');

    assert.equal(getRequestId(), 'REQ-AUDIT-12345');
    assert.equal(getActor(), 'USER-ADMIN-99');
    assert.equal(getIpAddress(), '192.168.1.100');
  });

  // Reverts to default outside
  assert.equal(getRequestId(), null);
});

test('Context Middleware - extracts headers, assigns defaults, and sets response X-Request-Id', (t, done) => {
  const req = {
    headers: {
      'x-request-id': 'REQ-CUSTOM-777',
      'x-actor-id': 'ADMIN-AGENT-01',
      'x-forwarded-for': '203.0.113.195, 70.41.3.18',
    },
    method: 'PATCH',
    originalUrl: '/api/v1/customers/CUST-1',
  };

  const res = {
    headers: {},
    setHeader(name, val) {
      this.headers[name] = val;
    },
  };

  contextMiddleware(req, res, () => {
    assert.equal(req.requestId, 'REQ-CUSTOM-777');
    assert.equal(req.actor, 'ADMIN-AGENT-01');
    assert.equal(req.ipAddress, '203.0.113.195');
    assert.equal(res.headers['X-Request-Id'], 'REQ-CUSTOM-777');

    const activeCtx = getRequestContext();
    assert.equal(activeCtx.requestId, 'REQ-CUSTOM-777');
    assert.equal(activeCtx.actor, 'ADMIN-AGENT-01');
    assert.equal(activeCtx.ipAddress, '203.0.113.195');
    done();
  });
});

test('Prisma Change-Capture Engine - records audit logs on entity update with diffs and active context', async () => {
  const auditLogsCreated = [];

  // Mock Prisma client with $extends mechanism
  const mockBaseClient = {
    customer: {
      findUnique: async ({ where }) => ({
        customerid: where.customerid,
        firstname: 'OriginalFirst',
        lastname: 'OriginalLast',
        emailadd: 'original@example.com',
      }),
    },
    auditlog: {
      create: async ({ data }) => {
        auditLogsCreated.push(data);
        return { auditid: 'AUDIT-LOG-1', ...data };
      },
      findMany: async ({ where }) => {
        return auditLogsCreated.filter(
          (log) => log.entityname === where.entityname && log.entityid === where.entityid
        );
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

      return client;
    },
  };

  const extendedClient = attachAuditExtension(mockBaseClient);

  const requestCtx = {
    requestId: 'REQ-DIFF-TEST-999',
    actor: 'SYS_ADMIN',
    ipAddress: '10.0.0.1',
  };

  await runWithContext(requestCtx, async () => {
    const updatedCustomer = await extendedClient.customer.update({
      where: { customerid: 'CUST-100' },
      data: {
        firstname: 'UpdatedFirst',
        emailadd: 'updated@example.com',
      },
    });

    assert.equal(updatedCustomer.firstname, 'UpdatedFirst');
  });

  assert.equal(auditLogsCreated.length, 1, 'One audit log should have been recorded');
  const loggedAudit = auditLogsCreated[0];
  assert.equal(loggedAudit.entityname, 'CUSTOMER');
  assert.equal(loggedAudit.entityid, 'CUST-100');
  assert.equal(loggedAudit.action, 'UPDATE');
  assert.deepEqual(loggedAudit.changedfields.sort(), ['emailadd', 'firstname'].sort());
  assert.equal(loggedAudit.oldvalues.firstname, 'OriginalFirst');
  assert.equal(loggedAudit.newvalues.firstname, 'UpdatedFirst');
  assert.equal(loggedAudit.requestid, 'REQ-DIFF-TEST-999');
  assert.equal(loggedAudit.actor, 'SYS_ADMIN');
  assert.equal(loggedAudit.ipaddress, '10.0.0.1');

  // Verify querying helper
  const queriedLogs = await getAuditLogsByEntity(mockBaseClient, 'CUSTOMER', 'CUST-100');
  assert.equal(queriedLogs.length, 1);
});
