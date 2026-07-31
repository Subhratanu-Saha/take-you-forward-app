const prisma = require('../utils/db');
const generateRandomAlphaNumeric = require('../utils/idGenerator');

/**
 * Generate a readable subscriber ID when the client does not send one.
 */
const generateSubscriberId = () => {
  const timestamp = Date.now();
  const randomStr = generateRandomAlphaNumeric(6);

  return `SUB-${timestamp}-${randomStr}`;
};

// ==================== GET ALL SUBSCRIBERS ====================
const getAllSubscribers = async () => {
  console.log('[SubscriberModel] Fetching all subscribers...');

  try {
    const subscribers = await prisma.subscriber.findMany();

    console.log(
      `[SubscriberModel] Successfully fetched ${subscribers.length} subscriber(s).`
    );

    return subscribers;
  } catch (error) {
    console.error(
      '[SubscriberModel] Error fetching subscribers:',
      error.message
    );
    console.error(error.stack);

    throw new Error(`Error fetching subscribers: ${error.message}`);
  }
};

// ==================== GET SUBSCRIBER BY ID ====================
const getSubscriberById = async (subscriberid) => {
  console.log(
    `[SubscriberModel] Fetching subscriber with ID: ${subscriberid}`
  );

  try {
    const subscriber = await prisma.subscriber.findUnique({
      where: { subscriberid },
    });

    if (!subscriber) {
      console.warn(
        `[SubscriberModel] Subscriber not found with ID: ${subscriberid}`
      );
    } else {
      console.log(
        `[SubscriberModel] Subscriber fetched successfully.`
      );
    }

    return subscriber;
  } catch (error) {
    console.error(
      `[SubscriberModel] Error fetching subscriber ${subscriberid}:`,
      error.message
    );
    console.error(error.stack);

    throw new Error(`Error fetching subscriber: ${error.message}`);
  }
};

// ==================== GET SUBSCRIBER BY CUSTOMER ID ====================
const getSubscriberByCustomerId = async (customerid) => {
  console.log(
    `[SubscriberModel] Fetching subscriber for Customer ID: ${customerid}`
  );

  try {
    const subscriber = await prisma.subscriber.findFirst({
      where: { customerid },
    });

    if (!subscriber) {
      console.warn(
        `[SubscriberModel] No subscriber found for Customer ID: ${customerid}`
      );
    } else {
      console.log(
        `[SubscriberModel] Subscriber fetched successfully for Customer ID: ${customerid}`
      );
    }

    return subscriber;
  } catch (error) {
    console.error(
      `[SubscriberModel] Error fetching subscriber for Customer ID ${customerid}:`,
      error.message
    );
    console.error(error.stack);

    throw new Error(
      `Error fetching subscriber by customerId: ${error.message}`
    );
  }
};

// ==================== CREATE SUBSCRIBER ====================
const createSubscriber = async (subscriberData) => {
  console.log('[SubscriberModel] Creating subscriber...');
  console.log('[SubscriberModel] Request Data:', subscriberData);

  try {
    const subscriber = await prisma.subscriber.create({
      data: {
        subscriberid:
          subscriberData.subscriberId ||
          subscriberData.subscriberid ||
          generateSubscriberId(),

        customerid:
          subscriberData.customerId ||
          subscriberData.customerid,

        issubscribe:
          subscriberData.isSubscribe !== undefined
            ? subscriberData.isSubscribe
            : subscriberData.issubscribe,

        emailpermstatus:
          subscriberData.emailPermStatus !== undefined
            ? subscriberData.emailPermStatus
            : subscriberData.emailpermstatus,

        smspermstatus:
          subscriberData.smsPermStatus !== undefined
            ? subscriberData.smsPermStatus
            : subscriberData.smspermstatus,

        sysmodifieddt: new Date(),
      },
    });

    console.log(
      `[SubscriberModel] Subscriber created successfully. ID: ${subscriber.subscriberid}`
    );

    return subscriber;
  } catch (error) {
    console.error(
      '[SubscriberModel] Error creating subscriber:',
      error.message
    );
    console.error(error.stack);

    throw new Error(`Error creating subscriber: ${error.message}`);
  }
};

// ==================== UPDATE SUBSCRIBER ====================
const updateSubscriber = async (subscriberid, subscriberData) => {
  console.log(
    `[SubscriberModel] Updating subscriber with ID: ${subscriberid}`
  );
  console.log('[SubscriberModel] Update Data:', subscriberData);

  try {
    const subscriber = await prisma.subscriber.update({
      where: { subscriberid },
      data: {
        issubscribe:
          subscriberData.isSubscribe !== undefined
            ? subscriberData.isSubscribe
            : subscriberData.issubscribe,

        emailpermstatus:
          subscriberData.emailPermStatus !== undefined
            ? subscriberData.emailPermStatus
            : subscriberData.emailpermstatus,

        smspermstatus:
          subscriberData.smsPermStatus !== undefined
            ? subscriberData.smsPermStatus
            : subscriberData.smspermstatus,

        sysmodifieddt: new Date(),
      },
    });

    console.log(
      `[SubscriberModel] Subscriber updated successfully. ID: ${subscriberid}`
    );

    return subscriber;
  } catch (error) {
    console.error(
      `[SubscriberModel] Error updating subscriber ${subscriberid}:`,
      error.message
    );
    console.error(error.stack);

      throw new Error(`Error updating subscriber: ${error.message}`);
  }
};

// ==================== GET ACTIVE EMAIL SUBSCRIBERS ====================
const getActiveEmailSubscribers = async () => {
  console.log('[SubscriberModel] Fetching active email subscribers...');

  try {
    const subscribers = await prisma.subscriber.findMany({
      where: {
        issubscribe: true,
        emailpermstatus: true,
      },
    });

    console.log(
      `[SubscriberModel] Successfully fetched ${subscribers.length} active email subscriber(s).`
    );

    return subscribers;
  } catch (error) {
    console.error(
      '[SubscriberModel] Error fetching active email subscribers:',
      error.message
    );
    console.error(error.stack);

    throw new Error(
      `Error fetching active email subscribers: ${error.message}`
    );
  }
};

module.exports = {
  getAllSubscribers,
  getSubscriberById,
  getSubscriberByCustomerId,
  createSubscriber,
  updateSubscriber,
  getActiveEmailSubscribers,
};