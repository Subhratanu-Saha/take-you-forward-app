const { EventEmitter } = require('events');

/**
 * Global event bus for application-wide event publishing and subscription
 * Used for event-driven workflows like loyalty updates triggered by purchase events
 */
class EventBus {
  constructor() {
    this.emitter = new EventEmitter();
    // Set high max listeners to avoid warnings for multiple subscriptions
    this.emitter.setMaxListeners(20);
  }

  /**
   * Publish an event to all subscribers
   * @param {string} eventName - Name of the event (e.g., 'customer.purchase')
   * @param {object} eventData - Event payload containing event details
   */
  publish(eventName, eventData) {
    console.log(`[EVENT_BUS] Publishing event: ${eventName}`, {
      eventName,
      eventId: eventData?.eventId || eventData?.eventid || 'unknown',
      customerId: eventData?.customerId || eventData?.customerid || 'unknown',
      timestamp: new Date().toISOString(),
    });

    this.emitter.emit(eventName, eventData);
  }

  /**
   * Subscribe to an event with a callback handler
   * @param {string} eventName - Name of the event to subscribe to
   * @param {function} handler - Callback function to handle the event
   * @returns {function} Unsubscribe function to remove the listener
   */
  subscribe(eventName, handler) {
    console.log(`[EVENT_BUS] Subscribing to event: ${eventName}`, {
      eventName,
      handlerName: handler.name || 'anonymous',
      timestamp: new Date().toISOString(),
    });

    this.emitter.on(eventName, handler);

    // Return unsubscribe function
    return () => {
      this.emitter.removeListener(eventName, handler);
      console.log(`[EVENT_BUS] Unsubscribed from event: ${eventName}`, {
        eventName,
        handlerName: handler.name || 'anonymous',
        timestamp: new Date().toISOString(),
      });
    };
  }

  /**
   * Subscribe to an event handler that only fires once
   * @param {string} eventName - Name of the event to subscribe to
   * @param {function} handler - Callback function to handle the event
   */
  subscribeOnce(eventName, handler) {
    this.emitter.once(eventName, handler);
  }

  /**
   * Get the number of listeners for an event
   * @param {string} eventName - Name of the event
   * @returns {number} Number of listeners
   */
  getListenerCount(eventName) {
    return this.emitter.listenerCount(eventName);
  }

  /**
   * Remove all listeners for an event or all events
   * @param {string} eventName - Optional name of the event (if omitted, removes all)
   */
  removeAllListeners(eventName) {
    if (eventName) {
      this.emitter.removeAllListeners(eventName);
    } else {
      this.emitter.removeAllListeners();
    }
  }
}

// Create and export a singleton instance
const eventBus = new EventBus();

module.exports = eventBus;
