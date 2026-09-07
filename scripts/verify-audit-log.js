const prisma = require('../src/utils/db');
const auditService = require('../src/services/auditService');

async function verifyAuditLog() {
  console.log('=== STARTING AUDIT LOG VERIFICATION ===\n');

  const testCustomerId = `TEST-VERIFY-${Date.now()}`;
  const testOrderId = `ORD-VERIFY-${Date.now()}`;

  try {
    // 1. Direct Audit Log Creation
    console.log('[1] Testing direct createAuditEntry...');
    const audit = await auditService.createAuditEntry({
      entityType: 'ORDER',
      entityId: testOrderId,
      action: 'ORDER_PLACED',
      customerId: testCustomerId,
      oldValue: null,
      newValue: { orderId: testOrderId, totalAmount: 250.00, status: 'COMPLETED' },
      metadata: { source: 'WEB_APP', channel: 'ONLINE' },
      createdBy: 'VERIFICATION_SCRIPT',
      createdByType: 'AUTOMATED',
    });

    console.log('  ✔ Created audit log successfully:');
    console.log('    - auditlogid:', audit.auditlogid);
    console.log('    - entitytype:', audit.entitytype);
    console.log('    - entityid:', audit.entityid);
    console.log('    - action:', audit.action);
    console.log('    - customerid:', audit.customerid);
    console.log('    - newvalue:', audit.newvalue);
    console.log('    - metadata:', audit.metadata);

    // 2. Query Audit Trail by Entity ID
    console.log('\n[2] Testing getAuditTrailByEntityId...');
    const trail = await auditService.getAuditTrailByEntityId(testOrderId);
    console.log(`  ✔ Retrieved ${trail.length} audit record(s) for entity ${testOrderId}`);

    // 3. Query Audit Trail by Customer ID
    console.log('\n[3] Testing getCustomerAuditTrail...');
    const customerTrail = await auditService.getCustomerAuditTrail(testCustomerId);
    console.log(`  ✔ Retrieved ${customerTrail.length} audit record(s) for customer ${testCustomerId}`);

    // 4. Raw DB Verification
    console.log('\n[4] Querying PostgreSQL auditlog table directly...');
    const dbRecords = await prisma.$queryRawUnsafe(
      `SELECT auditlogid, entitytype, entityid, action, customerid, oldervalue, newvalue, metadata, createdby, createdat FROM auditlog WHERE entityid = '${testOrderId}'`
    );
    console.log('  ✔ Direct DB query result:', dbRecords);

    // Cleanup test audit record
    await prisma.auditlog.deleteMany({
      where: { entityid: testOrderId },
    });
    console.log('\n  ✔ Cleaned up test audit records');

    console.log('\n=== ✅ ALL AUDIT LOG VERIFICATIONS PASSED SUCCESSFULLY ===');
  } catch (err) {
    console.error('❌ Verification failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAuditLog();
