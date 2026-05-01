const prisma = require('../utils/db');
const generateRandomAlphaNumeric = require('../utils/idGenerator');

/**
 * Generate a readable subscriber ID when the client does not send one.
 * This keeps the create flow working even if the request body only contains
 * the subscriber preferences and customer reference.
 */
const generateSubscriberId = () => {
  const timestamp = Date.now();
  const randomStr = generateRandomAlphaNumeric(6);

  return `SUB-${timestamp}-${randomStr}`;
};


/**
 * Fetch every subscriber record from the database.
 */
// ============Write your code ====================


/**
 * Fetch a single subscriber by its primary key.
 */
// ============Write your code ====================


/**
 * Fetch the first subscriber row for a customer.
 * Note: customerid is not unique in the schema, so findFirst is the safe query.
 */
// ============Write your code ====================


/**
 * Insert a new subscriber record into the downstream subscriber table.
 * Only the allowed table fields are mapped here so the service layer stays clean.
 */
const createSubscriber = async (subscriberData) => {
  try {
    return await prisma.subscriber.create({
      data: {
        // Use the provided ID when present; otherwise generate one.
        subscriberid: subscriberData.subscriberid || generateSubscriberId(),
        customerid: subscriberData.customerid,
        issubscribe: subscriberData.issubscribe,
        emailpermstatus: subscriberData.emailpermstatus,
        smspermstatus: subscriberData.smspermstatus,
        // Track when the record was last created/changed.
        sysmodifieddt: new Date(),
      },
    });
  } catch (error) {
    throw new Error(`Error creating subscriber: ${error.message}`);
  }
};

/**
 * Update an existing subscriber row by primary key.
 * Only mutable subscriber preference fields are updated here.
 */
const updateSubscriber = async (subscriberid, subscriberData) => {
  try {
    return await prisma.subscriber.update({
      where: { subscriberid },
      data: {
        issubscribe: subscriberData.issubscribe,
        emailpermstatus: subscriberData.emailpermstatus,
        smspermstatus: subscriberData.smspermstatus,
        sysmodifieddt: new Date(),
      },
    });
  } catch (error) {
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