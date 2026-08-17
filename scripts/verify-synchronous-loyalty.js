const assert = require('assert');
const prisma = require('../src/utils/db');
const orderService = require('../src/services/orderService');
const customerModel = require('../src/models/customer');

const TEST_CUSTOMER_ID = 'TEST-CUST-L-SYNC';

async function cleanup() {
  console.log('Cleaning up test records...');
  try {
    // Get test orders to clean line items
    const orders = await prisma.orderheader.findMany({
      where: { customerid: TEST_CUSTOMER_ID },
    });
    
    for (const order of orders) {
      await prisma.orderlineitems.deleteMany({
        where: { orderid: order.orderid },
      });
    }

    // Delete test orders
    await prisma.orderheader.deleteMany({
      where: { customerid: TEST_CUSTOMER_ID },
    });
    // Delete test ledger entries
    await prisma.loyaltyledger.deleteMany({
      where: { customerid: TEST_CUSTOMER_ID },
    });
    // Delete test loyalty record
    await prisma.loyalty.deleteMany({
      where: { customerid: TEST_CUSTOMER_ID },
    });
    // Delete test customer
    await prisma.customer.deleteMany({
      where: { customerid: TEST_CUSTOMER_ID },
    });
    console.log('Cleanup complete.');
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
}

async function runTests() {
  console.log('\n====================================================');
  console.log(' RUNNING SYNCHRONOUS LOYALTY VERIFICATION TESTS  ');
  console.log('====================================================\n');

  // Pre-test cleanup
  await cleanup();

  // Create test customer
  console.log('Step 1: Setting up test customer...');
  await customerModel.createCustomer({
    customerid: TEST_CUSTOMER_ID,
    firstname: 'Test',
    lastname: 'SyncUser',
    emailadd: 'test.sync@example.com',
    addressline1: '123 Test St',
    city: 'Testville',
    pincode: '99999',
    dob: new Date('1990-01-01'),
  });

  // ----------------------------------------------------
  // Test 1: Order Placement with Loyalty (Initial points)
  // ----------------------------------------------------
  console.log('\n--- TEST 1: Initial Loyalty Points Credit ---');
  const orderData1 = {
    customerid: TEST_CUSTOMER_ID,
    channel: 'WEB',
    payment: 'CARD',
    isloyalty: true,
    items: [
      {
        skuid: 'SKU-001',
        skuitem: 'Premium Coffee Maker',
        skuquantity: '1',
        skuprice: 150.00,
      }
    ]
  };

  const order1 = await orderService.createOrder(orderData1);
  assert.ok(order1, 'Test 1: Order should be created successfully');
  console.log(`Order ${order1.orderid} created successfully with amount ${order1.totalamount}`);

  // Verify loyalty balance in DB (15 points)
  const loyaltyRecord1 = await prisma.loyalty.findFirst({
    where: { customerid: TEST_CUSTOMER_ID },
  });
  assert.ok(loyaltyRecord1, 'Test 1: Loyalty summary record should be created');
  assert.strictEqual(Number(loyaltyRecord1.totalpoints), 15, 'Test 1: Should credit 15 points (150/10)');
  assert.strictEqual(loyaltyRecord1.tier, 'Bronze', 'Test 1: Tier should be Bronze');

  // Verify ledger entry
  const ledgerRecord1 = await prisma.loyaltyledger.findFirst({
    where: { orderid: order1.orderid },
  });
  assert.ok(ledgerRecord1, 'Test 1: Ledger entry should exist');
  assert.strictEqual(Number(ledgerRecord1.points), 15, 'Test 1: Ledger points should be 15');
  assert.strictEqual(ledgerRecord1.balanceafter, 15, 'Test 1: Ledger balance after should be 15');
  console.log('✔ Test 1 passed: Initial points credited successfully during checkout');

  // ----------------------------------------------------
  // Test 2: Accumulate Points on Second Checkout
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Accumulate Points on Second Checkout ---');
  const orderData2 = {
    customerid: TEST_CUSTOMER_ID,
    channel: 'WEB',
    payment: 'CASH',
    isloyalty: true,
    items: [
      {
        skuid: 'SKU-002',
        skuitem: 'Smart Grind Coffee grinder',
        skuquantity: '1',
        skuprice: 200.00,
      }
    ]
  };

  const order2 = await orderService.createOrder(orderData2);
  assert.ok(order2, 'Test 2: Second order should be created successfully');
  console.log(`Order ${order2.orderid} created successfully with amount ${order2.totalamount}`);

  // Verify updated loyalty balance in DB (15 + 20 = 35 points)
  const loyaltyRecord2 = await prisma.loyalty.findFirst({
    where: { customerid: TEST_CUSTOMER_ID },
  });
  assert.strictEqual(Number(loyaltyRecord2.totalpoints), 35, 'Test 2: Loyalty points should accumulate to 35 (15 + 20)');

  // Verify second ledger entry
  const ledgerRecord2 = await prisma.loyaltyledger.findFirst({
    where: { orderid: order2.orderid },
  });
  assert.ok(ledgerRecord2, 'Test 2: Second ledger entry should exist');
  assert.strictEqual(Number(ledgerRecord2.points), 20, 'Test 2: Ledger points should be 20');
  assert.strictEqual(ledgerRecord2.balanceafter, 35, 'Test 2: Ledger balance after should be 35');
  console.log('✔ Test 2 passed: Points accumulated correctly on second checkout');

  // ----------------------------------------------------
  // Test 3: Checkout with isloyalty: false
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Checkout without Loyalty Flag ---');
  const orderData3 = {
    customerid: TEST_CUSTOMER_ID,
    channel: 'MOBILE',
    payment: 'CARD',
    isloyalty: false,
    items: [
      {
        skuid: 'SKU-003',
        skuitem: 'Coffee Mug',
        skuquantity: '1',
        skuprice: 100.00,
      }
    ]
  };

  const order3 = await orderService.createOrder(orderData3);
  assert.ok(order3, 'Test 3: Third order should be created successfully');
  console.log(`Order ${order3.orderid} created successfully with amount ${order3.totalamount}`);

  // Verify loyalty balance did NOT increase (remains 35)
  const loyaltyRecord3 = await prisma.loyalty.findFirst({
    where: { customerid: TEST_CUSTOMER_ID },
  });
  assert.strictEqual(Number(loyaltyRecord3.totalpoints), 35, 'Test 3: Points should remain 35');

  // Verify no ledger record created for this orderid
  const ledgerCount3 = await prisma.loyaltyledger.count({
    where: { orderid: order3.orderid },
  });
  assert.strictEqual(ledgerCount3, 0, 'Test 3: No ledger entry should be created for non-loyalty order');
  console.log('✔ Test 3 passed: Checkout without loyalty flag does not affect points balance');

  console.log('\n====================================================');
  console.log('       ALL SYNCHRONOUS TESTS PASSED!                ');
  console.log('====================================================\n');
}

runTests()
  .then(async () => {
    await cleanup();
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('\n❌ Verification failed with error:', error);
    await cleanup();
    await prisma.$disconnect();
    process.exit(1);
  });
