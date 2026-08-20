const { EventEmitter } = require('events');

const logger = console;

let globalEventEmitter = null;

const getEventEmitter = () => {
  if (!globalEventEmitter) {
    globalEventEmitter = new EventEmitter();
    logger.info('EVENT_EMITTER: Global event emitter initialized');
  }
  return globalEventEmitter;
};

const emitEvent = (eventName, eventData) => {
  const emitter = getEventEmitter();
  logger.info('EVENT_EMITTER: Emitting event', {
    eventName,
    eventId: eventData?.eventId || eventData?.eventid || 'unknown',
    customerId: eventData?.customerId || eventData?.customerid || 'unknown',
  });
  emitter.emit(eventName, eventData);
};

module.exports = {
  getEventEmitter,
  emitEvent,
};
