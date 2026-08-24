const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createLoyaltyPurchaseConsumer,
} = require('../src/events/loyaltyEventConsumer');

test('failed loyalty event should succeed when the event is redelivered', async () => {
  let attempts = 0;

  const mockLoyaltyProcessor = {
    processLoyaltyEvent: async (event) => {
      attempts++;

      if (attempts === 1) {
        throw new Error('Temporary failure');
      }

      return {
        processed: true,
        event,
      };
    },
  };

  const consumer = createLoyaltyPurchaseConsumer({
    loyaltyProcessor: mockLoyaltyProcessor,
  });

  const event = {
    eventId: 'EVT-RETRY-001',
    customerId: 'CUST-123',
    totalpoints: 100,
  };

  const firstResult = await consumer.consume(event);

  const secondResult = await consumer.consume(event);

  assert.equal(firstResult.acknowledged, false);
  assert.equal(secondResult.acknowledged, true);
  assert.equal(attempts, 2);
});