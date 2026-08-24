const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createLoyaltyPurchaseConsumer,
} = require('../src/events/loyaltyEventConsumer');

const loyaltyService = require('../src/services/loyaltyService');
const loyaltyModel = require('../src/models/loyalty');
const customerModel = require('../src/models/customer');

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

    // Mock database operations used by updateLoyaltyTier
    const prisma = require('../src/utils/db');

    const originalLoyaltyFindFirst = prisma.loyalty.findFirst;
    const originalLoyaltyUpdate = prisma.loyalty.update;
    const originalLoyaltyCreate = prisma.loyalty.create;

    prisma.loyalty.findFirst = async () => null;

    prisma.loyalty.create = async ({ data }) => {
      updateCount++;

      return {
        loyaltyid: 1,
        ...data,
      };
    };

    prisma.loyalty.update = async ({ data }) => {
      updateCount++;

      return {
        loyaltyid: 1,
        ...data,
      };
    };

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

    // Restore Prisma mocks
    prisma.loyalty.findFirst = originalLoyaltyFindFirst;
    prisma.loyalty.update = originalLoyaltyUpdate;
    prisma.loyalty.create = originalLoyaltyCreate;

  } finally {
    loyaltyModel.findProcessedLoyaltyEvent =
      originalFindProcessed;

    loyaltyModel.recordProcessedLoyaltyEvent =
      originalRecordProcessed;

    customerModel.getCustomerById =
      originalCustomer;
  }
});