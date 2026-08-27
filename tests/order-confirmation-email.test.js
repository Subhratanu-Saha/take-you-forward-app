process.env.NODE_ENV = 'test';
process.env.EMAIL_USER_ID = process.env.EMAIL_USER_ID || 'test@example.com';
process.env.EMAIL_USER_PASSCODE = process.env.EMAIL_USER_PASSCODE || 'test-app-password';

const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/utils/db');
const { transporter } = require('../src/config/email');
const app = require('../src/app');

// Mock email transporter sendMail method directly on the configured transporter
const sentEmails = [];
const originalSendMail = transporter.sendMail;

transporter.sendMail = async (options) => {
  sentEmails.push(options);
  return { messageId: 'msg-mock-123', accepted: [options.to] };
};

const { generateOrderConfirmationHTML } = require('../src/templates/orderConfirmationTemplate');
const { sendOrderConfirmationEmail } = require('../src/services/orderEmailService');

test('Order Confirmation Email Template matches requirements', (t) => {
  const mockOrder = {
    orderid: 'ORD-123456-ABCDEF',
    totalamount: 120.50,
    taxamount: 15.00,
    discount: 5.50,
    payment: 'CARD',
    syslastmodifieddt: new Date('2026-08-27T19:40:00.000Z'),
    customer: {
      customerid: 'CUST-1787839925128-ABCDE12345',
      firstname: 'Subhratanu',
      lastname: 'Saha',
      emailadd: 'subh@example.com',
      addressline1: '123 Tech Lane',
      addressline2: 'Suite 400',
      city: 'Bangalore',
      pincode: '560001',
    },
    orderlineitems: [
      {
        skuid: 'SKU-001',
        skuitem: 'Mechanical Keyboard',
        skuquantity: '1',
        skuprice: 99.99,
      },
      {
        skuid: 'SKU-002',
        skuitem: 'USB-C Cable',
        skuquantity: '2',
        skuprice: 5.50,
      }
    ]
  };

  const html = generateOrderConfirmationHTML(mockOrder);

  // Assert basic presence
  assert.ok(html.includes('ORD-123456-ABCDEF'), 'HTML should contain order ID');
  assert.ok(html.includes('Subhratanu Saha'), 'HTML should contain customer full name');
  assert.ok(html.includes('123 Tech Lane'), 'HTML should contain address line 1');
  assert.ok(html.includes('Suite 400'), 'HTML should contain address line 2');
  assert.ok(html.includes('Bangalore - 560001'), 'HTML should contain city and pincode');
  assert.ok(html.includes('Mechanical Keyboard'), 'HTML should contain item 1 name');
  assert.ok(html.includes('USB-C Cable'), 'HTML should contain item 2 name');
  
  // Assert arithmetic formatting with 2 decimal places & currency
  assert.ok(html.includes('$99.99'), 'Item 1 unit price formatted correctly');
  assert.ok(html.includes('$11.00'), 'Item 2 line total formatted correctly');
  assert.ok(html.includes('$110.99'), 'Subtotal calculated and formatted correctly');
  assert.ok(html.includes('$15.00'), 'Tax formatted correctly');
  assert.ok(html.includes('$5.50'), 'Discount formatted correctly');
  assert.ok(html.includes('$120.50'), 'Total formatted correctly');
  assert.ok(html.includes('CARD'), 'Payment method matches');
});

test('Order Confirmation Email Template handles missing/fallback values safely', (t) => {
  const mockMinimalOrder = {
    orderid: 'ORD-987654-XYZ',
    totalamount: 100,
    payment: 'CASH',
    customer: {
      customerid: 'CUST-1787839925128-ABCDE12345',
      emailadd: 'test@example.com',
      addressline1: '456 Main St',
      city: 'Mumbai',
      pincode: '400001',
    },
    orderlineitems: [
      {
        skuquantity: '1',
        skuprice: 100.00,
      }
    ]
  };

  const html = generateOrderConfirmationHTML(mockMinimalOrder);

  assert.ok(html.includes('Valued Customer'), 'HTML should fallback customer name to Valued Customer');
  assert.ok(html.includes('Unknown Item'), 'HTML should fallback item name to Unknown Item');
  assert.ok(html.includes('$100.00'), 'Total formatted correctly');
  assert.ok(html.includes('$0.00'), 'Tax defaults to 0.00');
  assert.ok(html.includes('$0.00'), 'Discount defaults to 0.00');
  assert.ok(!html.includes('undefined'), 'HTML should not contain undefined strings');
});

test('sendOrderConfirmationEmail dispatches email and creates interaction', async (t) => {
  sentEmails.length = 0;
  
  // Mock interaction creation
  const createdInteractions = [];
  const originalCreateInteraction = prisma.interaction.create;
  prisma.interaction.create = async (args) => {
    createdInteractions.push(args.data);
    return { interactionid: 'INT-MOCK-1', ...args.data };
  };

  const mockOrder = {
    orderid: 'ORD-111111',
    totalamount: 50.00,
    payment: 'CARD',
    customer: {
      customerid: 'CUST-1787839925128-ABCDE12345',
      firstname: 'Alice',
      emailadd: 'alice@example.com',
      addressline1: '999 Street',
      city: 'Delhi',
      pincode: '110001',
    },
    orderlineitems: []
  };

  const result = await sendOrderConfirmationEmail(mockOrder);
  
  assert.ok(result.success, 'Email sending should report success');
  assert.equal(sentEmails.length, 1, 'One email should have been sent');
  assert.equal(sentEmails[0].to, 'alice@example.com', 'Recipient should match');
  assert.equal(sentEmails[0].subject, 'Order Confirmation - ORD-111111', 'Subject should match');
  
  assert.equal(createdInteractions.length, 1, 'One interaction should be recorded');
  assert.equal(createdInteractions[0].customerid, 'CUST-1787839925128-ABCDE12345', 'Interaction customer ID matches');
  assert.equal(createdInteractions[0].interactiontype, 'TRANSACTIONAL', 'Interaction type is TRANSACTIONAL');
  assert.equal(createdInteractions[0].interactionvalue, 'ORDER_CONFIRMATION_ORD-111111', 'Interaction value contains order ID');

  prisma.interaction.create = originalCreateInteraction;
});

test('Order API POST /api/v1/orders integration dispatches email', async (t) => {
  sentEmails.length = 0;

  // Mock Prisma methods used by order creation flow
  const original = {
    customerFindUnique: prisma.customer.findUnique,
    orderheaderCreate: prisma.orderheader.create,
    orderlineitemsCreate: prisma.orderlineitems.create,
    orderheaderFindUnique: prisma.orderheader.findUnique,
    loyaltyFindFirst: prisma.loyalty.findFirst,
    loyaltyCreate: prisma.loyalty.create,
    loyaltyUpdate: prisma.loyalty.update,
    interactionCreate: prisma.interaction.create,
    transaction: prisma.$transaction,
  };

  prisma.customer.findUnique = async () => ({
    customerid: 'CUST-1787839925128-ABCDE12345',
    firstname: 'Bob',
    lastname: 'Builder',
    emailadd: 'bob@example.com',
    addressline1: 'Construction Site',
    city: 'Townsville',
    pincode: '12345',
  });

  prisma.orderheader.create = async (args) => ({ orderid: 'ORD-777', ...args.data });
  prisma.orderlineitems.create = async (args) => ({ orderitemid: 'ITEM-777', ...args.data });
  prisma.orderheader.findUnique = async () => ({
    orderid: 'ORD-777',
    customerid: 'CUST-1787839925128-ABCDE12345',
    totalamount: 10.00,
    taxamount: 1.00,
    discount: 0.00,
    payment: 'CARD',
    syslastmodifieddt: new Date(),
    customer: {
      customerid: 'CUST-1787839925128-ABCDE12345',
      firstname: 'Bob',
      lastname: 'Builder',
      emailadd: 'bob@example.com',
      addressline1: 'Construction Site',
      city: 'Townsville',
      pincode: '12345',
    },
    orderlineitems: [
      {
        orderitemid: 'ITEM-777',
        orderid: 'ORD-777',
        skuid: 'SKU-777',
        skuitem: 'Builder Tool',
        skuquantity: '1',
        skuprice: 9.00,
      }
    ],
  });

  prisma.loyalty.findFirst = async () => null;
  prisma.loyalty.create = async (args) => ({ loyaltyid: 777, ...args.data });
  prisma.loyalty.update = async (args) => ({ loyaltyid: 777, ...args.data.data });
  prisma.interaction.create = async (args) => ({ interactionid: 'INT-777', ...args.data });
  prisma.$transaction = async (callback) => callback(prisma);

  // Start the server
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const payload = {
      customerid: 'CUST-1787839925128-ABCDE12345',
      payment: 'CARD',
      channel: 'WEB',
      totalamount: 10.00,
      taxamount: 1.00,
      discount: 0.00,
      isloyalty: true,
      orderlineitems: [
        {
          skuid: 'SKU-777',
          skuitem: 'Builder Tool',
          skuquantity: 1,
          skuprice: 9.00,
        }
      ]
    };

    const response = await fetch(`http://localhost:${port}/api/v1/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const body = await response.json();

    assert.equal(response.status, 201, 'Response status should be 201 Created');
    assert.ok(body.success, 'Response should report success');
    assert.equal(body.data.orderid, 'ORD-777', 'Returned order ID matches');

    // Assert SMTP sendMail was called
    assert.equal(sentEmails.length, 1, 'SMTP dispatch should have run');
    assert.equal(sentEmails[0].to, 'bob@example.com', 'Recipient should match mock customer email');
    assert.ok(sentEmails[0].html.includes('Builder Tool'), 'HTML body should contain item details');

  } finally {
    server.close();
    // Restore mocks
    prisma.customer.findUnique = original.customerFindUnique;
    prisma.orderheader.create = original.orderheaderCreate;
    prisma.orderlineitems.create = original.orderlineitemsCreate;
    prisma.orderheader.findUnique = original.orderheaderFindUnique;
    prisma.loyalty.findFirst = original.loyaltyFindFirst;
    prisma.loyalty.create = original.loyaltyCreate;
    prisma.loyalty.update = original.loyaltyUpdate;
    prisma.interaction.create = original.interactionCreate;
    prisma.$transaction = original.transaction;
  }
});
