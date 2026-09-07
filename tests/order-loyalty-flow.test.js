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
const { getEventEmitter } = require('../src/events/eventEmitter');
const { createOrder, updateOrder } = require('../src/services/orderService');
const app = require('../src/app');

test('createOrder emits a purchase event without updating loyalty directly', async () => {
  const emitter = getEventEmitter();
  const purchaseEvents = [];
  const purchaseListener = (event) => purchaseEvents.push(event);
  emitter.on('customer.purchase', purchaseListener);

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
    assert.equal(purchaseEvents.length, 1);
    assert.equal(purchaseEvents[0].customerId, 'CUST-123');
    assert.equal(purchaseEvents[0].orderId, 'ORD-123');
    assert.equal(calls.includes('loyalty.create'), false);
    assert.equal(calls.includes('loyalty.update'), false);
  } finally {
    emitter.off('customer.purchase', purchaseListener);
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

test('createOrder succeeds and calculates total server-side when totalamount is omitted', async () => {
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
    let createdOrderData = null;
    prisma.customer.findUnique = async () => ({ customerid: 'CUST-123' });
    prisma.orderheader.create = async (args) => {
      createdOrderData = args.data;
      return { orderid: 'ORD-123', ...args.data };
    };
    prisma.orderlineitems.create = async (args) => ({ orderitemid: 'ITEM-123', ...args.data });
    prisma.orderheader.findUnique = async () => ({
      orderid: 'ORD-123',
      customerid: 'CUST-123',
      totalamount: 180,
      customer: { customerid: 'CUST-123' },
      orderlineitems: [],
    });
    prisma.loyalty.findFirst = async () => null;
    prisma.loyalty.create = async (args) => ({ loyaltyid: 1, ...args.data });
    prisma.loyalty.update = async (args) => ({ loyaltyid: 1, ...args.data.data });
    prisma.$transaction = async (callback) => callback(prisma);

    const order = await createOrder({
      customerid: 'CUST-123',
      channel: 'WEB',
      payment: 'CARD',
      taxamount: 0,
      discount: 20,
      // totalamount is intentionally omitted
      isloyalty: true,
      items: [{
        skuid: 'SKU-1',
        skuitem: 'Sample item',
        skuquantity: 2,
        skuprice: 100,
      }],
    });

    assert.ok(order, 'order should be created');
    assert.equal(createdOrderData.totalamount, 180, 'totalamount should be calculated as (100 * 2) + 0 - 20 = 180');
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

test('updateOrder recalculates totalamount when taxamount and discount are updated without totalamount', async () => {
  const original = {
    orderheaderFindUnique: prisma.orderheader.findUnique,
    orderheaderUpdate: prisma.orderheader.update,
  };

  try {
    let updatedOrderPayload = null;
    prisma.orderheader.findUnique = async () => ({
      orderid: 'ORD-123',
      customerid: 'CUST-123',
      taxamount: 10,
      discount: 5,
      totalamount: 205,
      orderlineitems: [
        { skuid: 'SKU-1', skuitem: 'Item 1', skuquantity: '2', skuprice: 100 }, // Subtotal: 200
      ],
      customer: { customerid: 'CUST-123' },
    });

    prisma.orderheader.update = async (args) => {
      updatedOrderPayload = args.data;
      return {
        orderid: 'ORD-123',
        ...args.data,
      };
    };

    const updated = await updateOrder('ORD-123', {
      taxamount: 20,
      discount: 10,
    });

    assert.ok(updated, 'order should be updated');
    assert.equal(updatedOrderPayload.taxamount, 20);
    assert.equal(updatedOrderPayload.discount, 10);
    assert.equal(
      updatedOrderPayload.totalamount,
      210,
      'totalamount should be recalculated as 200 + 20 - 10 = 210'
    );
  } finally {
    prisma.orderheader.findUnique = original.orderheaderFindUnique;
    prisma.orderheader.update = original.orderheaderUpdate;
  }
});

test('updateOrder succeeds when matching totalamount is provided', async () => {
  const original = {
    orderheaderFindUnique: prisma.orderheader.findUnique,
    orderheaderUpdate: prisma.orderheader.update,
  };

  try {
    let updatedOrderPayload = null;
    prisma.orderheader.findUnique = async () => ({
      orderid: 'ORD-123',
      customerid: 'CUST-123',
      taxamount: 10,
      discount: 5,
      totalamount: 205,
      orderlineitems: [
        { skuid: 'SKU-1', skuitem: 'Item 1', skuquantity: '2', skuprice: 100 },
      ],
      customer: { customerid: 'CUST-123' },
    });

    prisma.orderheader.update = async (args) => {
      updatedOrderPayload = args.data;
      return {
        orderid: 'ORD-123',
        ...args.data,
      };
    };

    const updated = await updateOrder('ORD-123', {
      taxamount: 20,
      discount: 10,
      totalamount: 210,
    });

    assert.ok(updated, 'order should be updated');
    assert.equal(updatedOrderPayload.totalamount, 210);
  } finally {
    prisma.orderheader.findUnique = original.orderheaderFindUnique;
    prisma.orderheader.update = original.orderheaderUpdate;
  }
});

test('updateOrder throws ValidationError when totalamount does not match calculated total', async () => {
  const original = {
    orderheaderFindUnique: prisma.orderheader.findUnique,
    orderheaderUpdate: prisma.orderheader.update,
  };

  try {
    prisma.orderheader.findUnique = async () => ({
      orderid: 'ORD-123',
      customerid: 'CUST-123',
      taxamount: 10,
      discount: 5,
      totalamount: 205,
      orderlineitems: [
        { skuid: 'SKU-1', skuitem: 'Item 1', skuquantity: '2', skuprice: 100 },
      ],
      customer: { customerid: 'CUST-123' },
    });

    await assert.rejects(
      async () => {
        await updateOrder('ORD-123', {
          taxamount: 20,
          discount: 10,
          totalamount: 999, // Mismatch with 210
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
    prisma.orderheader.findUnique = original.orderheaderFindUnique;
    prisma.orderheader.update = original.orderheaderUpdate;
  }
});

test('Order API PUT /api/v1/orders/:orderId recalculates totalamount and supports optional totalamount', async () => {
  const original = {
    orderheaderFindUnique: prisma.orderheader.findUnique,
    orderheaderUpdate: prisma.orderheader.update,
  };

  const server = app.listen(0);
  const port = server.address().port;

  try {
    prisma.orderheader.findUnique = async () => ({
      orderid: 'ORD-1788590000000-ABCDEF',
      customerid: 'CUST-123',
      taxamount: 10,
      discount: 5,
      totalamount: 205,
      payment: 'CARD',
      orderlineitems: [
        { skuid: 'SKU-1', skuitem: 'Item 1', skuquantity: '2', skuprice: 100 },
      ],
      customer: { customerid: 'CUST-123' },
    });

    prisma.orderheader.update = async (args) => ({
      orderid: 'ORD-1788590000000-ABCDEF',
      ...args.data,
    });

    // 1. PUT without totalamount
    const resWithoutTotal = await fetch(`http://localhost:${port}/api/v1/orders/ORD-1788590000000-ABCDEF`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxamount: 20, discount: 10 }),
    });
    const bodyWithoutTotal = await resWithoutTotal.json();
    assert.equal(resWithoutTotal.status, 200);
    assert.equal(bodyWithoutTotal.success, true);
    assert.equal(bodyWithoutTotal.data.totalamount, 210);

    // 2. PUT with mismatching totalamount
    const resMismatch = await fetch(`http://localhost:${port}/api/v1/orders/ORD-1788590000000-ABCDEF`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxamount: 20, discount: 10, totalamount: 500 }),
    });
    const bodyMismatch = await resMismatch.json();
    assert.equal(resMismatch.status, 400);
    assert.equal(bodyMismatch.success, false);
    assert.equal(bodyMismatch.errorCode, 'ORDER_VALIDATION_FAILED');
  } finally {
    server.close();
    prisma.orderheader.findUnique = original.orderheaderFindUnique;
    prisma.orderheader.update = original.orderheaderUpdate;
  }
});

