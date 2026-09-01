const subscriberModel = require('../models/subscriber');
const auditService = require('./auditService');

// ==================== GET ALL SUBSCRIBERS ====================
const getAllSubscribers = async () => {
  console.log('Fetching all subscribers...');
  try {
    const subscribers = await subscriberModel.getAllSubscribers();
    console.log(`Successfully fetched ${subscribers.length} subscribers.`);
    return subscribers;
  } catch (error) {
    console.error('Error fetching subscribers:', error.message);
    throw error;
  }
};

// ==================== GET SUBSCRIBER BY ID ====================
const getSubscriberById = async (subscriberid) => {
  console.log(`Fetching subscriber with ID: ${subscriberid}`);
  try {
    const subscriber = await subscriberModel.getSubscriberById(subscriberid);
    if (!subscriber) {
      throw new Error('Subscriber not found');
    }
    console.log(`Successfully fetched subscriber: ${subscriber.name}`);
    return subscriber;
  } catch (error) {
    console.error('Error fetching subscriber:', error.message);
    throw error;
  }
};

// ==================== GET SUBSCRIBER BY CUSTOMER ID ====================
const getSubscriberByCustomerId = async (customerid) => {

  console.log(`Fetching subscriber for customer ID: ${customerid}`);
  try {
    const subscriber = await subscriberModel.getSubscriberByCustomerId(customerid);
    if (!subscriber) {
      console.warn(`Subscriber not found for customer ID: ${customerid}`);
      throw new Error('Subscriber not found for this customer');
    }
    console.log(`Successfully fetched subscriber: ${subscriber.name}`);
    return subscriber;
  } catch (error) {
    console.error('Error fetching subscriber by customer ID:', error.message);
    console.error(error.stack);
    throw error;
  }
};

// ==================== CREATE SUBSCRIBER ====================
const createSubscriber = async (subscriberData) => {

console.log('Creating new subscriber with data:', subscriberData);

try {
  const newSubscriber = await subscriberModel.createSubscriber(subscriberData);
  console.log('Successfully created subscriber:', newSubscriber);
  return newSubscriber;
} catch (error) {
  console.error('Error creating subscriber:', error.message);
  throw error;
}
};

// ==================== UPDATE SUBSCRIBER ====================
const updateSubscriber = async (subscriberid, subscriberData) => {
  
 console.log(`Updating subscriber with ID: ${subscriberid}`);
  try {
    // ✅ Fetch CURRENT state BEFORE update
    const currentSubscriber = await subscriberModel.getSubscriberById(subscriberid);
    if (!currentSubscriber) {
      throw new Error('Subscriber not found for update');
    }

    // ✅ Perform the update using model layer
    const updatedSubscriber = await subscriberModel.updateSubscriber(subscriberid, subscriberData);

    // ✅ Detect changes
    const consentChanges = [];
    
    if (updatedSubscriber.issubscribe !== currentSubscriber.issubscribe) {
      consentChanges.push("issubscribe");
    }
    if (updatedSubscriber.emailpermstatus !== currentSubscriber.emailpermstatus) {
      consentChanges.push("emailpermstatus");
    }
    if (updatedSubscriber.smspermstatus !== currentSubscriber.smspermstatus) {
      consentChanges.push("smspermstatus");
    }
      // ✅ Audit if changes detected
    if (consentChanges.length > 0) {
      const auditEntry = await auditService.createAuditEntry({
        entityType: "SUBSCRIBER",
        entityId: subscriberid,
        action: "CONSENT_CHANGED",
        customerId: updatedSubscriber.customerid,
        oldValue: {
          issubscribe: currentSubscriber.issubscribe,
          emailpermstatus: currentSubscriber.emailpermstatus,
          smspermstatus: currentSubscriber.smspermstatus,
        },
        newValue: {
          issubscribe: updatedSubscriber.issubscribe,
          emailpermstatus: updatedSubscriber.emailpermstatus,
          smspermstatus: updatedSubscriber.smspermstatus,
        },
        metadata: {
          changedFields: consentChanges,
        },
      });

      if (auditEntry) {
        console.info(`[SUBSCRIBER_AUDIT] Consent audit created for customer=${updatedSubscriber.customerid}, fields=${consentChanges.join(",")}`);
      
    } else {
        console.warn(`[SUBSCRIBER_AUDIT] Failed to create consrent audit for customer=${updatedSubscriber.customerid}`);
    }
      }

    console.log(`Successfully updated subscriber: ${subscriberid}`);
    return updatedSubscriber;
  } catch (error) {
    console.error(`Error updating subscriber ${subscriberid}:`, error.message);
    throw new Error(`Error updating subscriber: ${error.message}`);
  }
};
module.exports = {
  getAllSubscribers,
  getSubscriberById,
  getSubscriberByCustomerId,
  createSubscriber,
  updateSubscriber,
};