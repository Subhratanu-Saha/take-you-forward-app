const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createLoyaltyPurchaseConsumer,
} = require('../src/events/loyaltyEventConsumer');

test('failed loyalty event should be rejected and acknowledged as failure', async () => {
  const mockLoyaltyProcessor = {
    processLoyaltyEvent: async () => {
      throw new Error('Temporary processing failure');
    },
  };

  const consumer = createLoyaltyPurchaseConsumer({
    loyaltyProcessor: mockLoyaltyProcessor,
  });

  let ackCalled = false;
  let ackSuccess = null;

  const event = {
    eventId: 'EVT-FAIL-001',
    customerId: 'CUST-123',
    totalpoints: 100,
  };

  const result = await consumer.consume(
    event,
    async (success) => {
      ackCalled = true;
      ackSuccess = success;
    }
  );

  assert.equal(result.acknowledged, false);
  assert.equal(result.valid, true);
  assert.equal(ackCalled, true);
  assert.equal(ackSuccess, false);
  assert.equal(result.error, 'Temporary processing failure');
});