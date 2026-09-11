const prisma = require('../src/utils/db');
const { recordAuditLog } = require('../src/services/auditService');

async function seedAuditDemoLogs() {
  await prisma.$connect();
  console.log('Seeding demo audit logs for TUF-170 visual diff & request correlation...');

  const orderReqId = 'req_order_checkout_7701';
  const profileReqId = 'req_profile_update_3392';
  const purgeReqId = 'req_account_purge_9941';

  // 1. Transaction Flow (3 correlated events in single API request)
  await recordAuditLog(prisma, {
    entityType: 'ORDERHEADER',
    entityId: 'ORD-2026-9001',
    action: 'CREATE',
    customerId: 'CUST-DEMO-001',
    newValue: {
      orderid: 'ORD-2026-9001',
      customerid: 'CUST-DEMO-001',
      totalamount: '249.99',
      taxamount: '18.50',
      payment: 'CREDIT_CARD',
      channel: 'WEB',
      isloyalty: true,
    },
    requestId: orderReqId,
    actor: 'cust_aarav@example.com',
  });

  await recordAuditLog(prisma, {
    entityType: 'LOYALTY',
    entityId: 'LOY-5501',
    action: 'UPDATE',
    customerId: 'CUST-DEMO-001',
    oldValue: {
      loyaltyid: 5501,
      customerid: 'CUST-DEMO-001',
      totalpoints: 120,
      tier: 'Bronze',
      isactive: true,
    },
    newValue: {
      loyaltyid: 5501,
      customerid: 'CUST-DEMO-001',
      totalpoints: 370,
      tier: 'Silver',
      isactive: true,
    },
    changedFields: ['totalpoints', 'tier'],
    requestId: orderReqId,
    actor: 'cust_aarav@example.com',
  });

  await recordAuditLog(prisma, {
    entityType: 'LOYALTYLEDGER',
    entityId: 'LED-8802',
    action: 'CREATE',
    customerId: 'CUST-DEMO-001',
    newValue: {
      ledgerid: 8802,
      customerid: 'CUST-DEMO-001',
      orderid: 'ORD-2026-9001',
      points: 250,
      balanceafter: 370,
      ledgertype: 'PURCHASE_EARN',
    },
    requestId: orderReqId,
    actor: 'SYSTEM',
  });

  // 2. Profile Update (UPDATE with changed fields)
  await recordAuditLog(prisma, {
    entityType: 'CUSTOMER',
    entityId: 'CUST-DEMO-002',
    action: 'UPDATE',
    customerId: 'CUST-DEMO-002',
    oldValue: {
      customerid: 'CUST-DEMO-002',
      firstname: 'Priya',
      lastname: 'Patel',
      emailadd: 'priya.patel@example.com',
      contactnum: '+919812345678',
      addressline1: '15 Park Street',
      city: 'Kolkata',
      pincode: '700016',
      isloyalty: true,
    },
    newValue: {
      customerid: 'CUST-DEMO-002',
      firstname: 'Priya',
      lastname: 'Patel',
      emailadd: 'priya.patel@example.com',
      contactnum: '+919999988888',
      addressline1: '99 Residency Road',
      city: 'Bengaluru',
      pincode: '560025',
      isloyalty: true,
    },
    changedFields: ['contactnum', 'addressline1', 'city', 'pincode'],
    requestId: profileReqId,
    actor: 'admin@tuf-retail.com',
  });

  // 3. Purge Record (DELETE)
  await recordAuditLog(prisma, {
    entityType: 'CUSTOMER',
    entityId: 'CUST-DEMO-999',
    action: 'DELETE',
    customerId: 'CUST-DEMO-999',
    oldValue: {
      customerid: 'CUST-DEMO-999',
      firstname: 'Test',
      lastname: 'User',
      emailadd: 'test.user@todelete.com',
      city: 'Delhi',
      isloyalty: false,
    },
    newValue: null,
    changedFields: ['customerid', 'firstname', 'lastname', 'emailadd', 'city', 'isloyalty'],
    requestId: purgeReqId,
    actor: 'compliance_officer@tuf-retail.com',
  });

  console.log('Demo audit logs seeded successfully!');
  await prisma.$disconnect();
}

seedAuditDemoLogs().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
