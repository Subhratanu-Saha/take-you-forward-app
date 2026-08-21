const loyaltyService = require('../services/loyaltyService');
const { validatePurchaseEvent } = require('./loyaltyEventValidator');
const { getEventEmitter } = require('./eventEmitter');

const logger = console;

const createLoyaltyPurchaseConsumer = ({
  eventName = 'customer.purchase',
  loyaltyProcessor = loyaltyService,
} = {}) => {
  const emitter = getEventEmitter();

  const consume = async (event, ackCallback) => {
    const validation = validatePurchaseEvent(event);

    if (!validation.valid) {
      logger.warn('LOYALTY_EVENT_CONSUMER: rejected invalid purchase event', {
        eventId: event?.eventId || event?.eventid || 'unknown',
        customerId: event?.customerId || event?.customerid || 'unknown',
        errors: validation.errors,
      });

      if (typeof ackCallback === 'function') {
        await ackCallback(false, validation.errors);
      }

      return {
        acknowledged: false,
        valid: false,
        errors: validation.errors,
      };
    }

    const { eventId, customerId, totalpoints } = validation.normalized;

    logger.info('LOYALTY_EVENT_CONSUMER: received valid purchase event', {
      eventId,
      customerId,
      totalpoints,
    });

    try {
      const result = await loyaltyProcessor.processLoyaltyEvent({
        eventId,
        customerId,
        type: 'PURCHASE',
        payload: { totalpoints, customerId },
      });

      logger.info('LOYALTY_EVENT_CONSUMER: event processed successfully', {
        eventId,
        customerId,
        totalpoints,
        result,
      });

      if (typeof ackCallback === 'function') {
        await ackCallback(true, result);
      }

      return {
        acknowledged: true,
        valid: true,
        eventId,
        customerId,
        totalpoints,
        result,
      };
    } catch (error) {
      logger.error('LOYALTY_EVENT_CONSUMER: processing failed', {
        eventId,
        customerId,
        totalpoints,
        error: error.message,
      });

      if (typeof ackCallback === 'function') {
        await ackCallback(false, error);
      }

      return {
        acknowledged: false,
        valid: true,
        eventId,
        customerId,
        totalpoints,
        error: error.message,
      };
    }
  };

  const subscribe = () => {
    emitter.on(eventName, async (event, ackCallback) => {
      await consume(event, ackCallback);
    });

    return emitter;
  };

  return {
    emitter,
    eventName,
    consume,
    listener: consume,
    subscribe,
  };
};

const loyaltyPurchaseConsumer = createLoyaltyPurchaseConsumer();

module.exports = {
  createLoyaltyPurchaseConsumer,
  consumePurchaseEvent: loyaltyPurchaseConsumer.consume,
  processPurchaseEvent: loyaltyPurchaseConsumer.consume,
  handleCustomerPurchaseEvent: loyaltyPurchaseConsumer.consume,
  subscribeLoyaltyPurchaseEvents: loyaltyPurchaseConsumer.subscribe,
  loyaltyPurchaseConsumer,
  consume: loyaltyPurchaseConsumer.consume,
};