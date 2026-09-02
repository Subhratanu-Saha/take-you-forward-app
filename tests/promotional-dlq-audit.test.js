const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

const auditService = require('../src/services/auditService');
const prisma = require('../src/utils/db');

describe('Promotional DLQ Service - Audit Logging', () => {

  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  it('should create an audit entry for a DLQ retry attempt', async () => {
    const customerId = 'CUST_DLQ_TEST';
    const dlqEventId = `DLQ-RETRY-${Date.now()}`;

    try {
      await prisma.promotionaldlq.create({
        data: {
          eventid: dlqEventId,
          customerid: customerId,
          emailaddress: 'test@example.com',
          subject: 'Test Campaign',
          payload: {
            customerId,
            emailaddress: 'test@example.com',
          },
          errormessage: 'Initial error',
          attemptcount: 0,
          status: 'PENDING',
          createdat: new Date(),
          updatedat: new Date(),
          lastattemptat: new Date(),
          nextretryat: new Date(Date.now() - 1000),
        },
      });

      const retryAudit = await auditService.createAuditEntry({
        entityType: 'DLQ',
        entityId: dlqEventId,
        action: 'DLQ_RETRY_ATTEMPT',
        customerId,

        oldValue: {
          status: 'PENDING',
          attemptcount: 0,
        },

        metadata: {
          retryAttempt: 1,
          retryType: 'AUTOMATED',
          subject: 'Test Campaign',
          errorMessage: 'Initial error',
        },
      });

      assert.ok(retryAudit);
      assert.strictEqual(retryAudit.entitytype, 'DLQ');
      assert.strictEqual(retryAudit.entityid, dlqEventId);
      assert.strictEqual(retryAudit.action, 'DLQ_RETRY_ATTEMPT');
      assert.strictEqual(retryAudit.customerid, customerId);
      assert.strictEqual(retryAudit.metadata.retryAttempt, 1);

    } finally {
      await prisma.auditlog.deleteMany({
        where: {
          entityid: dlqEventId,
        },
      });

      await prisma.promotionaldlq.deleteMany({
        where: {
          eventid: dlqEventId,
        },
      });
    }
  });


  it('should create an audit entry when DLQ retry succeeds', async () => {
    const customerId = 'CUST_DLQ_SUCCESS';
    const dlqEventId = `DLQ-SUCCESS-${Date.now()}`;

    try {
      await prisma.promotionaldlq.create({
        data: {
          eventid: dlqEventId,
          customerid: customerId,
          emailaddress: 'success@example.com',
          subject: 'Success Campaign',
          payload: {
            customerId,
          },
          attemptcount: 1,
          status: 'PENDING',
          createdat: new Date(),
          updatedat: new Date(),
        },
      });

      const successAudit = await auditService.createAuditEntry({
        entityType: 'DLQ',
        entityId: dlqEventId,
        action: 'DLQ_RETRY_SUCCESS',
        customerId,

        oldValue: {
          status: 'PENDING',
          attemptcount: 1,
        },

        newValue: {
          status: 'SENT',
          attemptcount: 2,
        },

        metadata: {
          successfulAttempt: 2,
          subject: 'Success Campaign',
        },
      });

      assert.ok(successAudit);
      assert.strictEqual(
        successAudit.action,
        'DLQ_RETRY_SUCCESS'
      );

      assert.strictEqual(
        successAudit.newvalue.status,
        'SENT'
      );

    } finally {
      await prisma.auditlog.deleteMany({
        where: {
          entityid: dlqEventId,
        },
      });

      await prisma.promotionaldlq.deleteMany({
        where: {
          eventid: dlqEventId,
        },
      });
    }
  });


  it('should create an audit entry when DLQ retry is skipped', async () => {
    const customerId = 'CUST_DLQ_SKIP';
    const dlqEventId = `DLQ-SKIP-${Date.now()}`;

    try {
      await prisma.promotionaldlq.create({
        data: {
          eventid: dlqEventId,
          customerid: customerId,
          emailaddress: 'skip@example.com',
          subject: 'Skip Campaign',
          payload: {
            customerId,
          },
          attemptcount: 0,
          status: 'PENDING',
          createdat: new Date(),
          updatedat: new Date(),
        },
      });

      const skipAudit = await auditService.createAuditEntry({
        entityType: 'DLQ',
        entityId: dlqEventId,
        action: 'DLQ_RETRY_SKIPPED',
        customerId,

        newValue: {
          status: 'SKIPPED',
        },

        metadata: {
          skipReason: 'Subscriber opt-out',
          subject: 'Skip Campaign',
        },
      });

      assert.ok(skipAudit);

      assert.strictEqual(
        skipAudit.action,
        'DLQ_RETRY_SKIPPED'
      );

      assert.strictEqual(
        skipAudit.metadata.skipReason,
        'Subscriber opt-out'
      );

    } finally {
      await prisma.auditlog.deleteMany({
        where: {
          entityid: dlqEventId,
        },
      });

      await prisma.promotionaldlq.deleteMany({
        where: {
          eventid: dlqEventId,
        },
      });
    }
  });


  it('should create an audit entry for temporary retry failure', async () => {
    const customerId = 'CUST_DLQ_TEMP_FAIL';
    const dlqEventId = `DLQ-TEMP-FAIL-${Date.now()}`;

    try {
      await prisma.promotionaldlq.create({
        data: {
          eventid: dlqEventId,
          customerid: customerId,
          emailaddress: 'tempfail@example.com',
          subject: 'Temporary Failure Campaign',
          payload: {
            customerId,
          },
          attemptcount: 1,
          status: 'PENDING',
          createdat: new Date(),
          updatedat: new Date(),
        },
      });

      const failAudit = await auditService.createAuditEntry({
        entityType: 'DLQ',
        entityId: dlqEventId,
        action: 'DLQ_RETRY_FAILED_TEMP',
        customerId,

        oldValue: {
          status: 'PENDING',
          attemptcount: 1,
        },

        newValue: {
          status: 'PENDING',
          attemptcount: 2,
        },

        metadata: {
          failedAttempt: 2,
          maxRetries: 3,
          errorMessage: 'Temporary email service failure',
          isFinal: false,
        },
      });

      assert.ok(failAudit);

      assert.strictEqual(
        failAudit.action,
        'DLQ_RETRY_FAILED_TEMP'
      );

      assert.strictEqual(
        failAudit.metadata.isFinal,
        false
      );

    } finally {
      await prisma.auditlog.deleteMany({
        where: {
          entityid: dlqEventId,
        },
      });

      await prisma.promotionaldlq.deleteMany({
        where: {
          eventid: dlqEventId,
        },
      });
    }
  });


  it('should create an audit entry for final retry failure', async () => {
    const customerId = 'CUST_DLQ_FINAL_FAIL';
    const dlqEventId = `DLQ-FINAL-FAIL-${Date.now()}`;

    try {
      await prisma.promotionaldlq.create({
        data: {
          eventid: dlqEventId,
          customerid: customerId,
          emailaddress: 'finalfail@example.com',
          subject: 'Final Failure Campaign',
          payload: {
            customerId,
          },
          attemptcount: 3,
          status: 'PENDING',
          createdat: new Date(),
          updatedat: new Date(),
        },
      });

      const finalFailAudit = await auditService.createAuditEntry({
        entityType: 'DLQ',
        entityId: dlqEventId,
        action: 'DLQ_RETRY_FAILED_FINAL',
        customerId,

        newValue: {
          status: 'FAILED',
          attemptcount: 4,
        },

        metadata: {
          failedAttempt: 4,
          maxRetries: 3,
          errorMessage: 'Maximum retry attempts exceeded',
          isFinal: true,
        },
      });

      assert.ok(finalFailAudit);

      assert.strictEqual(
        finalFailAudit.action,
        'DLQ_RETRY_FAILED_FINAL'
      );

      assert.strictEqual(
        finalFailAudit.metadata.isFinal,
        true
      );

    } finally {
      await prisma.auditlog.deleteMany({
        where: {
          entityid: dlqEventId,
        },
      });

      await prisma.promotionaldlq.deleteMany({
        where: {
          eventid: dlqEventId,
        },
      });
    }
  });

});