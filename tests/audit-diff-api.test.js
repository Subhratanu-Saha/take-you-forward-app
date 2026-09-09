const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/utils/db');
const {
  recordAuditLog,
  getAuditLogs,
  getAuditLogsByRequestId,
  getAuditLogById,
} = require('../src/services/auditService');

describe('Audit Diff & Single Request Correlation API', () => {
  const testRequestId = 'TEST-REQ-CORRELATION-999';
  let createdLogId;
  let updateLogId;
  let deleteLogId;

  before(async () => {
    await prisma.$connect();

    // 1. Create a CREATE record
    const createRecord = await recordAuditLog(prisma, {
      entityType: 'ORDERHEADER',
      entityId: 'TEST-ORD-001',
      action: 'CREATE',
      customerId: 'TEST-CUST-DIFF',
      newValue: {
        orderid: 'TEST-ORD-001',
        totalamount: '150.00',
        payment: 'CARD',
      },
      requestId: testRequestId,
      actor: 'tester@example.com',
    });
    createdLogId = createRecord.auditid;

    // 2. Create an UPDATE record with diff
    const updateRecord = await recordAuditLog(prisma, {
      entityType: 'LOYALTY',
      entityId: 'TEST-LOY-001',
      action: 'UPDATE',
      customerId: 'TEST-CUST-DIFF',
      oldValue: {
        tier: 'Bronze',
        totalpoints: '100',
      },
      newValue: {
        tier: 'Silver',
        totalpoints: '250',
      },
      changedFields: ['tier', 'totalpoints'],
      requestId: testRequestId,
      actor: 'tester@example.com',
    });
    updateLogId = updateRecord.auditid;

    // 3. Create a DELETE record
    const deleteRecord = await recordAuditLog(prisma, {
      entityType: 'LOYALTYLEDGER',
      entityId: 'TEST-LED-001',
      action: 'DELETE',
      customerId: 'TEST-CUST-DIFF',
      oldValue: {
        ledgerid: 999,
        points: '50',
      },
      requestId: testRequestId,
      actor: 'system-cleanup',
    });
    deleteLogId = deleteRecord.auditid;
  });

  after(async () => {
    await prisma.auditlog.deleteMany({
      where: {
        customerid: 'TEST-CUST-DIFF',
      },
    });
    await prisma.$disconnect();
  });

  test('getAuditLogs should return oldvalues, newvalues, changedfields, and requestid', async () => {
    const res = await getAuditLogs(prisma, 1, 10, { requestId: testRequestId });
    assert.ok(res.data);
    assert.strictEqual(res.data.length, 3);

    const updateLog = res.data.find((l) => l.action === 'UPDATE');
    assert.ok(updateLog);
    assert.strictEqual(updateLog.requestid, testRequestId);
    assert.deepStrictEqual(updateLog.changedfields, ['tier', 'totalpoints']);
    assert.strictEqual(updateLog.oldvalues.tier, 'Bronze');
    assert.strictEqual(updateLog.newvalues.tier, 'Silver');
  });

  test('getAuditLogsByRequestId should return all correlated changes in chronological order', async () => {
    const logs = await getAuditLogsByRequestId(prisma, testRequestId);
    assert.strictEqual(logs.length, 3);
    assert.strictEqual(logs[0].entityid, 'TEST-ORD-001');
    assert.strictEqual(logs[0].action, 'CREATE');
    assert.strictEqual(logs[1].entityid, 'TEST-LOY-001');
    assert.strictEqual(logs[1].action, 'UPDATE');
    assert.strictEqual(logs[2].entityid, 'TEST-LED-001');
    assert.strictEqual(logs[2].action, 'DELETE');
  });

  test('getAuditLogById should retrieve complete single record', async () => {
    const log = await getAuditLogById(prisma, updateLogId);
    assert.ok(log);
    assert.strictEqual(log.auditid, updateLogId);
    assert.strictEqual(log.entityname, 'LOYALTY');
    assert.strictEqual(log.action, 'UPDATE');
    assert.strictEqual(log.requestid, testRequestId);
    assert.deepStrictEqual(log.changedfields, ['tier', 'totalpoints']);
  });

  test('HTTP GET /api/v1/audit-logs/request/:requestId returns correlated logs via endpoint', async () => {
    const app = require('../src/app');
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const resp = await fetch(`http://localhost:${port}/api/v1/audit-logs/request/${testRequestId}`);
      assert.strictEqual(resp.status, 200);
      const body = await resp.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.count, 3);
      assert.strictEqual(body.data[0].action, 'CREATE');
      assert.strictEqual(body.data[1].action, 'UPDATE');
      assert.strictEqual(body.data[2].action, 'DELETE');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('HTTP GET /api/v1/audit-logs/:id returns full diff payload via endpoint', async () => {
    const app = require('../src/app');
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const resp = await fetch(`http://localhost:${port}/api/v1/audit-logs/${updateLogId}`);
      assert.strictEqual(resp.status, 200);
      const body = await resp.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.auditid, updateLogId);
      assert.deepStrictEqual(body.data.changedfields, ['tier', 'totalpoints']);
      assert.strictEqual(body.data.oldvalues.tier, 'Bronze');
      assert.strictEqual(body.data.newvalues.tier, 'Silver');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
