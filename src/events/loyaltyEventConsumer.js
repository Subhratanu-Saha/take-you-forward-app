const { EventEmitter } = require('events');
const loyaltyService = require('../services/loyaltyService');
const { validatePurchaseEvent } = require('./loyaltyEventValidator');

const logger = console;

const createLoyaltyPurchaseConsumer = ({
  eventName = 'customer.purchase',
  loyaltyProcessor = loyaltyService,
} = {}) => {
  const emitter = new EventEmitter();

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
      // Extract orderid from event data if available
      const orderid = event?.orderid || event?.orderId || `LOY-${Date.now()}`;

      // Call processPurchaseEvent to create/update loyalty records
      // This is different from processLoyaltyEvent which only updates tier
      const result = await loyaltyProcessor.processPurchaseEvent({
        customerid: customerId,
        orderid,
        totalamount: totalpoints,
        eventId,
        points: totalpoints,
      });

      logger.info('LOYALTY_EVENT_CONSUMER: event processed successfully', {
        eventId,
        customerId,
        totalpoints,
        result: {
          duplicate: result.duplicate,
          loyaltyId: result.loyalty?.loyaltyid,
          ledgerId: result.ledger?.ledgerid,
        },
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
