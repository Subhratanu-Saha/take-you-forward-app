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
      console.warn(`[PROMOTIONAL_WELCOME] Welcome email skipped for customer=${customer?.customerid || 'unknown'}: missing customer ID or email`);
      return { success: false, message: 'Missing customer ID or email' };
    }

    console.info(`[PROMOTIONAL_WELCOME] Preparing welcome email for customer=${customer.customerid}`);

    const subscriber = await waitForSubscriber(customer.customerid, {
      maxRetries: 2,
      delayMs: 1000,
    });

    if (!subscriber || !subscriber.issubscribe || !subscriber.emailpermstatus) {
      console.warn(`[PROMOTIONAL_WELCOME] Welcome email skipped for customer=${customer.customerid}: subscriber not opted in or record not found`);
      return {
        success: true,
        skipped: true,
        message: 'Email skipped: subscriber not opted in or record not found',
      };
    }

    const result = await promotionalMessageService.sendPromotionalEmails(
      customer,
      PROMOTIONAL_ONBOARDING_EMAIL_SUBJECT
    );

    if (result.success && !result.skipped) {
      console.log(`[PROMOTIONAL_WELCOME] Welcome email sent to ${customer.emailadd}`);
    }

    return result;
  } catch (error) {
    console.error(`[PROMOTIONAL_WELCOME] Welcome email dispatch failed for customer=${customer?.customerid || 'unknown'}: ${error.message}`);
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
      console.warn(`[PROMOTIONAL_WELCOME] Subscriber record not yet available for customer=${customerid}; retry ${attempt}/${maxRetries}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return null;
};

module.exports = { sendWelcomeEmail };
