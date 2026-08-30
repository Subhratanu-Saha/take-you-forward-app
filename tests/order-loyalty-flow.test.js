process.env.NODE_ENV = 'test';
process.env.EMAIL_USER_ID = process.env.EMAIL_USER_ID || 'test@example.com';
process.env.EMAIL_USER_PASSCODE = process.env.EMAIL_USER_PASSCODE || 'test-app-password';

const nodemailer = require('nodemailer');
const originalCreateTransport = nodemailer.createTransport;

nodemailer.createTransport = (...args) => {
  const transport = originalCreateTransport(...args);
  transport.verify = async () => true;
  return transport;
};

const test = require('node:test');
const assert = require('node:assert/strict');

const prisma = require('../src/utils/db');
const { createOrder } = require('../src/services/orderService');

test('createOrder triggers loyalty update after successful order ingestion', async () => {
  const original = {
    customerFindUnique: prisma.customer.findUnique,
    orderheaderCreate: prisma.orderheader.create,
    orderlineitemsCreate: prisma.orderlineitems.create,
    orderheaderFindUnique: prisma.orderheader.findUnique,
    loyaltyFindFirst: prisma.loyalty.findFirst,
    loyaltyCreate: prisma.loyalty.create,
    loyaltyUpdate: prisma.loyalty.update,
    transaction: prisma.$transaction,
  };

  try {
    const calls = [];

    prisma.customer.findUnique = async () => ({ customerid: 'CUST-123' });
    prisma.orderheader.create = async (args) => {
      calls.push('orderheader.create');
      return { orderid: 'ORD-123', ...args.data };
    };
    prisma.orderlineitems.create = async (args) => {
      calls.push('orderlineitems.create');
      return { orderitemid: 'ITEM-123', ...args.data };
    };
    prisma.orderheader.findUnique = async () => ({
      orderid: 'ORD-123',
      customerid: 'CUST-123',
      totalamount: 100,
      customer: { customerid: 'CUST-123' },
      orderlineitems: [],
    });
    prisma.loyalty.findFirst = async () => null;
    prisma.loyalty.create = async (args) => {
      calls.push('loyalty.create');
      return { loyaltyid: 1, ...args.data };
    };
    prisma.loyalty.update = async (args) => {
      calls.push('loyalty.update');
      return { loyaltyid: 1, ...args.data.data };
    };
    prisma.$transaction = async (callback) => callback(prisma);

    const order = await createOrder({
      customerid: 'CUST-123',
      channel: 'WEB',
      payment: 'CARD',
      isloyalty: true,
      items: [{
        skuid: 'SKU-1',
        skuitem: 'Sample item',
        skuquantity: 1,
        skuprice: 100,
      }],
    });

    assert.ok(order, 'order should be created');
    assert.ok(
      calls.includes('loyalty.create') || calls.includes('loyalty.update'),
      'loyalty should be synchronized after order creation'
    );
  } finally {
    prisma.customer.findUnique = original.customerFindUnique;
    prisma.orderheader.create = original.orderheaderCreate;
    prisma.orderlineitems.create = original.orderlineitemsCreate;
    prisma.orderheader.findUnique = original.orderheaderFindUnique;
    prisma.loyalty.findFirst = original.loyaltyFindFirst;
    prisma.loyalty.create = original.loyaltyCreate;
    prisma.loyalty.update = original.loyaltyUpdate;
    prisma.$transaction = original.transaction;
  }
});

test('createOrder throws ValidationError when totalamount does not match calculated total', async () => {
  const original = {
    customerFindUnique: prisma.customer.findUnique,
    transaction: prisma.$transaction,
  };

  try {
    prisma.customer.findUnique = async () => ({ customerid: 'CUST-123' });
    prisma.$transaction = async (callback) => callback(prisma);

    await assert.rejects(
      async () => {
        await createOrder({
          customerid: 'CUST-123',
          channel: 'WEB',
          payment: 'CARD',
          totalamount: 500, // Mismatch (calculated is 100)
          isloyalty: true,
          items: [{
            skuid: 'SKU-1',
            skuitem: 'Sample item',
            skuquantity: 1,
            skuprice: 100,
          }],
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.equal(err.errorCode, 'ORDER_VALIDATION_FAILED');
        assert.match(err.message, /Total amount mismatch/);
        return true;
      }
    );
  } finally {
    prisma.customer.findUnique = original.customerFindUnique;
    prisma.$transaction = original.transaction;
  }
});

