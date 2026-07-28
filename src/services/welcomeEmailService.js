const promotionalMessageService = require('./promotionalMessageService');
const SubscriberModel = require('../models/subscriber');
const { PROMOTIONAL_ONBOARDING_EMAIL_SUBJECT } = require('../constants/constant');

/**
 * Sends a personalized promotional welcome email to a newly created customer.
 *
 * Handles the subscriber race condition: since the subscriber record is created
 * concurrently (via a parallel promise), it may not exist yet when this function
 * runs. A single retry after a short delay covers this timing gap.
 *
 * @param {Object} customer - The full customer object returned from createCustomer
 * @param {string} customer.customerid - Unique customer ID
 * @param {string} customer.emailadd   - Customer email (exclusive recipient)
 * @param {string} customer.firstname  - Used for template personalization
 * @param {string} [customer.lastname] - Used for template personalization
 * @param {string} [customer.city]     - Used for template personalization
 * @returns {Promise<Object>} Result from promotionalMessageService
 */
const sendWelcomeEmail = async (customer) => {
  try {
    if (!customer || !customer.customerid || !customer.emailadd) {
      console.warn('⚠️ Welcome email skipped: missing customer ID or email');
      return { success: false, message: 'Missing customer ID or email' };
    }

    // Wait briefly for the subscriber record to be created by the parallel task
    const subscriber = await waitForSubscriber(customer.customerid, {
      maxRetries: 2,
      delayMs: 1000,
    });

    if (!subscriber || !subscriber.issubscribe || !subscriber.emailpermstatus) {
      console.log(`ℹ️ Welcome email skipped for ${customer.customerid}: subscriber not opted in`);
      return {
        success: true,
        skipped: true,
        message: 'Email skipped: subscriber not opted in or record not found',
      };
    }

    // Delegate to the existing promotional message service
    const result = await promotionalMessageService.sendPromotionalEmails(
      customer,
      PROMOTIONAL_ONBOARDING_EMAIL_SUBJECT
    );

    if (result.success && !result.skipped) {
      console.log(`✉️ Welcome email sent to ${customer.emailadd}`);
    }

    return result;
  } catch (error) {
    // Errors here must never propagate — the customer 201 response must be unaffected
    console.error('❌ Welcome email dispatch failed:', error.message);
    return { success: false, message: error.message };
  }
};

/**
 * Waits for the subscriber record to appear in the database.
 * Retries with a delay to handle the race condition with concurrent subscriber creation.
 */
const waitForSubscriber = async (customerid, { maxRetries = 2, delayMs = 1000 } = {}) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const subscriber = await SubscriberModel.getSubscriberByCustomerId(customerid);

    if (subscriber) {
      return subscriber;
    }

    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
};

module.exports = { sendWelcomeEmail };
