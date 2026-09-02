const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');

const auditService = require('../src/services/auditService');
const prisma = require('../src/utils/db');

describe('Audit Service - Core Functionality', () => {

  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    await prisma.auditlog.deleteMany({
      where: {
        customerid: {
          in: [
            'TEST-CUST001',
            'TEST-CUST002',
            'TEST-CUST003',
            'TEST-CUST004',
            'TEST-CUST005',
          ],
        },
      },
    });

    await prisma.$disconnect();
  });

  // Test 1: Create audit entry
  test('should create audit entry with all required fields', async () => {
    const audit = await auditService.createAuditEntry({
      entityType: 'LOYALTY',
      entityId: 'TEST-LOY-123',
      action: 'TIER_UPGRADED',
      customerId: 'TEST-CUST001',
      oldValue: {
        tier: 'Bronze',
        totalpoints: 4900,
      },
      newValue: {
        tier: 'Silver',
        totalpoints: 5200,
      },
      metadata: {
        orderId: 'TEST-ORD-123',
        transitionFrom: 'Bronze',
        transitionTo: 'Silver',
      },
    });

    assert.ok(audit);
    assert.ok(audit.auditlogid);
    assert.strictEqual(audit.entitytype, 'LOYALTY');
    assert.strictEqual(audit.action, 'TIER_UPGRADED');
    assert.strictEqual(audit.customerid, 'TEST-CUST001');
  });

  // Test 2: Missing required fields
  test('should return null for missing entityType', async () => {
    const audit = await auditService.createAuditEntry({
      entityId: 'TEST-123',
      action: 'TIER_UPGRADED',
    });

    assert.strictEqual(audit, null);
  });

  // Test 3: Get audit trail by entity ID
  test('should retrieve audit trail by entity ID', async () => {
    const entityId = 'TEST-LOY-456';

    await auditService.createAuditEntry({
      entityType: 'LOYALTY',
      entityId,
      action: 'POINTS_EARNED',
      customerId: 'TEST-CUST002',
    });

    await auditService.createAuditEntry({
      entityType: 'LOYALTY',
      entityId,
      action: 'TIER_UPGRADED',
      customerId: 'TEST-CUST002',
    });

    const trail =
      await auditService.getAuditTrailByEntityId(entityId);

    assert.ok(Array.isArray(trail));
    assert.ok(trail.length >= 2);
    assert.strictEqual(trail[0].entityid, entityId);
  });

  // Test 4: Get customer audit trail
  test('should retrieve all audits for a customer', async () => {
    const customerId = 'TEST-CUST003';

    await auditService.createAuditEntry({
      entityType: 'LOYALTY',
      entityId: 'TEST-LOY-789',
      action: 'POINTS_EARNED',
      customerId,
    });

    await auditService.createAuditEntry({
      entityType: 'SUBSCRIBER',
      entityId: 'TEST-SUB-789',
      action: 'CONSENT_CHANGED',
      customerId,
    });

    const trail =
      await auditService.getCustomerAuditTrail(customerId);

    assert.ok(Array.isArray(trail));
    assert.ok(trail.length >= 2);

    assert.ok(
      trail.every(
        (audit) => audit.customerid === customerId
      )
    );
  });

  // Test 5: Filter by entity type
  test('should filter customer audit trail by entity type', async () => {
    const customerId = 'TEST-CUST004';

    await auditService.createAuditEntry({
      entityType: 'LOYALTY',
      entityId: 'TEST-LOY-001',
      action: 'POINTS_EARNED',
      customerId,
    });

    await auditService.createAuditEntry({
      entityType: 'DLQ',
      entityId: 'TEST-DLQ-001',
      action: 'DLQ_RETRY_ATTEMPT',
      customerId,
    });

    const loyaltyOnly =
      await auditService.getCustomerAuditTrail(customerId, {
        entityType: 'LOYALTY',
      });

    assert.ok(
      loyaltyOnly.every(
        (audit) => audit.entitytype === 'LOYALTY'
      )
    );
  });

});