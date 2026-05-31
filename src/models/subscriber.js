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
const getAllSubscribers = async () => {
  try {
    return await prisma.subscriber.findMany();
  } catch (error) {
    throw new Error(`Error fetching subscribers: ${error.message}`);
  }
};


/**
 * Fetch a single subscriber by its primary key.
 */
// ============Write your code ====================
const getSubscriberById = async (subscriberid) => {
  try {
    return await prisma.subscriber.findUnique({
      where: { subscriberid }
    });
  } catch (error) {
    throw new Error(`Error fetching subscriber: ${error.message}`);
  }
};


/**
 * Fetch the first subscriber row for a customer.
 * Note: customerid is not unique in the schema, so findFirst is the safe query.
 */
// ============Write your code ====================
const getSubscriberByCustomerId = async (customerid) => {
  try {
    return await prisma.subscriber.findFirst({
      where: { customerid }
    });
  } catch (error) {
    throw new Error(`Error fetching subscriber by customerId: ${error.message}`);
  }
};

/**
 * Insert a new subscriber record into the downstream subscriber table.
 * Maps camelCase input parameters to lowercase Prisma field names.
 */
const createSubscriber = async (subscriberData) => {
  try {
    return await prisma.subscriber.create({
      data: {
        // Use the provided ID when present; otherwise generate one.
        subscriberid: subscriberData.subscriberId || subscriberData.subscriberid || generateSubscriberId(),
        customerid: subscriberData.customerId || subscriberData.customerid,
        issubscribe: subscriberData.isSubscribe !== undefined ? subscriberData.isSubscribe : subscriberData.issubscribe,
        emailpermstatus: subscriberData.emailPermStatus !== undefined ? subscriberData.emailPermStatus : subscriberData.emailpermstatus,
        smspermstatus: subscriberData.smsPermStatus !== undefined ? subscriberData.smsPermStatus : subscriberData.smspermstatus,
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
 * Maps camelCase input parameters to lowercase Prisma field names.
 * Only mutable subscriber preference fields are updated.
 */
const updateSubscriber = async (subscriberid, subscriberData) => {
  try {
    return await prisma.subscriber.update({
      where: { subscriberid },
      data: {
        issubscribe: subscriberData.isSubscribe !== undefined ? subscriberData.isSubscribe : subscriberData.issubscribe,
        emailpermstatus: subscriberData.emailPermStatus !== undefined ? subscriberData.emailPermStatus : subscriberData.emailpermstatus,
        smspermstatus: subscriberData.smsPermStatus !== undefined ? subscriberData.smsPermStatus : subscriberData.smspermstatus,
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