const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createLoyaltyPurchaseConsumer,
} = require('../src/events/loyaltyEventConsumer');

const loyaltyService = require('../src/services/loyaltyService');
const loyaltyModel = require('../src/models/loyalty');
const customerModel = require('../src/models/customer');

test('recordProcessedLoyaltyEvent creates a ledger entry when the event has not been recorded yet', async () => {
  const created = [];
  const tx = {
    loyaltyledger: {
      findFirst: async () => null,
      create: async ({ data }) => {
        created.push(data);
        return { ...data, ledgerid: 42 };
      },
      updateMany: async () => {
        throw new Error('updateMany should not be used to record a missing event');
      },
    },
  };

  const result = await loyaltyModel.recordProcessedLoyaltyEvent('EVENT-TRACK-001', tx);

  assert.equal(result, true);
  assert.equal(created.length, 1);
  assert.equal(created[0].eventid, 'EVENT-TRACK-001');
  assert.equal(created[0].ledgertype, 'EVENT');
});

test('duplicate customer.purchase event should be skipped', async () => {
  const originalFindProcessed =
    loyaltyModel.findProcessedLoyaltyEvent;

  const originalRecordProcessed =
    loyaltyModel.recordProcessedLoyaltyEvent;

  const originalCustomer =
    customerModel.getCustomerById;

  let updateCount = 0;
  const processedEvents = new Set();

  try {
    // Mock customer
    customerModel.getCustomerById = async () => ({
      customerid: 'CUST-123',
    });

    // Mock processed-event check
    loyaltyModel.findProcessedLoyaltyEvent = async (eventId) => {
      return processedEvents.has(eventId)
        ? { eventId }
        : null;
    };

    // Mock processed-event recording
    loyaltyModel.recordProcessedLoyaltyEvent = async (eventId) => {
      processedEvents.add(eventId);
    };

    const prisma = require('../src/utils/db');

    const tx = {
      customer: {
        findUnique: async () => ({ customerid: 'CUST-123' }),
      },
      loyalty: {
        findFirst: async () => null,
        create: async ({ data }) => {
          updateCount++;
          return {
            loyaltyid: 1,
            ...data,
          };
        },
        update: async ({ data }) => {
          updateCount++;
          return {
            loyaltyid: 1,
            ...data,
          };
        },
      },
      loyaltyledger: {
        findFirst: async () => null,
        create: async ({ data }) => ({ ledgerid: 1, ...data }),
      },
      auditlog: {
        create: async ({ data }) => ({ auditid: 'AUD-1', ...data }),
      },
    };

    const originalTransaction = prisma.$transaction;
    prisma.$transaction = async (callback) => callback(tx);

    const consumer = createLoyaltyPurchaseConsumer({
      loyaltyProcessor: loyaltyService,
    });

    const event = {
      eventId: 'EVENT-001',
      customerId: 'CUST-123',
      totalpoints: 100,
    };

    // First event
    const firstResult = await consumer.consume(event);

    // Second - duplicate event
    const secondResult = await consumer.consume(event);

    assert.equal(firstResult.acknowledged, true);

    assert.equal(
      secondResult.acknowledged,
      true
    );

    assert.equal(
      firstResult.result.duplicate,
      false
    );

    assert.equal(
      secondResult.result.duplicate,
      true
    );

    assert.equal(
      secondResult.result.skipped,
      true
    );

    assert.equal(
      updateCount,
      1,
      'loyalty should be updated only once'
    );

    prisma.$transaction = originalTransaction;

  } finally {
    loyaltyModel.findProcessedLoyaltyEvent =
      originalFindProcessed;

    loyaltyModel.recordProcessedLoyaltyEvent =
      originalRecordProcessed;

    customerModel.getCustomerById =
      originalCustomer;
  }
});