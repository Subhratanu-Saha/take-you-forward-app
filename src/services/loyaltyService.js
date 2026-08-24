const loyaltyModel = require('../models/loyalty');
const customerModel = require('../models/customer');
const { calculateTier } = require('../utils/loyalty');
const prisma = require('../utils/db');

const generateLoyaltyEventId = ({ customerid, orderid }) => {
  const safeCustomerId = customerid || 'unknown';
  const safeOrderId = orderid || 'order';

  return `LOY-${safeCustomerId}-${safeOrderId}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const processPurchaseEvent = async ({ customerid, orderid, totalamount, eventId, points, transactionClient = prisma }) => {
  const normalizedEventId = (eventId || points?.eventId || '').toString().trim() || generateLoyaltyEventId({ customerid, orderid });
  const normalizedCustomerId = customerid?.trim();
  const normalizedOrderId = orderid?.trim();
  const amount = Number(totalamount ?? points ?? 0);
  const earnedPoints = Number(points ?? Math.max(0, amount));

  if (!normalizedCustomerId) {
    throw new Error('Customer ID is required');
  }

  const existingEvent = await loyaltyModel.findProcessedLoyaltyEvent(normalizedEventId);

  if (existingEvent) {
    console.warn('[LOYALTY_SERVICE] Duplicate purchase event detected and skipped', {
      eventId: normalizedEventId,
      customerid: normalizedCustomerId,
      orderid: normalizedOrderId,
      source: existingEvent.source,
    });

    return {
      duplicate: true,
      eventId: normalizedEventId,
      customerid: normalizedCustomerId,
      orderid: normalizedOrderId,
      skipped: true,
    };
  }

  const customer = await customerModel.getCustomerById(normalizedCustomerId);

  if (!customer) {
    throw new Error('Customer not found');
  }

  const existingLoyalty = await transactionClient.loyalty.findFirst({
    where: { customerid: normalizedCustomerId },
    orderBy: { createdat: 'desc' },
  });

  const currentPoints = Number(existingLoyalty?.totalpoints ?? 0);
  const nextTotalPoints = currentPoints + earnedPoints;
  const nextTier = calculateTier(nextTotalPoints);

  const updatedOrCreatedLoyalty = existingLoyalty
    ? await transactionClient.loyalty.update({
        where: { loyaltyid: existingLoyalty.loyaltyid },
        data: {
          totalpoints: nextTotalPoints,
          tier: nextTier,
          isactive: existingLoyalty.isactive ?? true,
          updatedat: new Date(),
          lastearnedat: new Date(),
        },
      })
    : await transactionClient.loyalty.create({
        data: {
          customerid: normalizedCustomerId,
          totalpoints: nextTotalPoints,
          tier: nextTier,
          isactive: true,
          lastearnedat: new Date(),
          lastredeemedat: new Date(),
          createdat: new Date(),
          updatedat: new Date(),
        },
      });

  const ledgerEntry = await transactionClient.loyaltyledger.create({
    data: {
      customerid: normalizedCustomerId,
      orderid: normalizedOrderId || `LOY-${Date.now()}`,
      eventid: normalizedEventId,
      ledgertype: 'EARNED',
      points: Number(earnedPoints),
      balanceafter: Number(nextTotalPoints),
      expirydate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdat: new Date(),
      updatedat: new Date(),
    },
  });

  await loyaltyModel.recordProcessedLoyaltyEvent(normalizedEventId, transactionClient);

  console.info('[LOYALTY_SERVICE] Purchase event processed successfully', {
    eventId: normalizedEventId,
    customerid: normalizedCustomerId,
    orderid: normalizedOrderId,
    earnedPoints,
    totalpoints: nextTotalPoints,
    loyaltyId: updatedOrCreatedLoyalty.loyaltyid,
    ledgerId: ledgerEntry.ledgerid,
  });

  return {
    duplicate: false,
    eventId: normalizedEventId,
    customerid: normalizedCustomerId,
    orderid: normalizedOrderId,
    earnedPoints,
    totalPoints: nextTotalPoints,
    loyalty: updatedOrCreatedLoyalty,
    ledger: ledgerEntry,
  };
};

// UPDATE loyalty tier
const updateLoyaltyTier = async (customerid, totalpoints) => {
  try {
    console.log(
      `[LOYALTY_SERVICE] Starting loyalty tier update for customerId=${customerid}`
    );

    // Validate customer ID
    if (!customerid?.trim()) {
      throw new Error('Customer ID is required');
    }

    // Validate total points
    if (totalpoints === undefined || totalpoints === null) {
      throw new Error('Total points are required');
    }

    totalpoints = Number(totalpoints);

    if (isNaN(totalpoints)) {
      throw new Error('Total points must be a number');
    }

    if (totalpoints < 0) {
      throw new Error('Total points cannot be negative');
    }

    // Check customer exists
    const customer = await customerModel.getCustomerById(customerid);

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Calculate loyalty tier
    const newTier = calculateTier(totalpoints);

    console.log(
      `[LOYALTY_SERVICE] Calculated tier=${newTier} for totalpoints=${totalpoints}`
    );

    // Update loyalty record
    const result = await loyaltyModel.updateLoyaltyTier(
      customerid,
      totalpoints,
      newTier
    );

    console.log(
      `[LOYALTY_SERVICE] Loyalty updated successfully for customerId=${customerid}`
    );

    return result;
  } catch (error) {
    console.error(
      `[LOYALTY_SERVICE] Error updating loyalty tier for customerId=${customerid}`,
      error
    );

    throw new Error(`Error updating loyalty tier: ${error.message}`);
  }
};

// GET loyalty summary
const getLoyaltySummary = async (customerid) => {
  try {
    console.log(
      `[LOYALTY_SERVICE] Fetching loyalty summary for customerId=${customerid}`
    );

    if (!customerid?.trim()) {
      throw new Error('Customer ID is required');
    }

    const customer = await customerModel.getCustomerById(customerid);

    if (!customer) {
      throw new Error('Customer not found');
    }

    const summary =
      await loyaltyModel.getLoyaltySummaryByCustomerId(customerid);

    if (!summary) {
      return null;
    }

    console.log(
      `[LOYALTY_SERVICE] Loyalty summary fetched successfully for customerId=${customerid}`
    );

    return summary;
  } catch (error) {
    console.error(
      `[LOYALTY_SERVICE] Error fetching loyalty summary`,
      error
    );

    throw new Error(`Error fetching loyalty summary: ${error.message}`);
  }
};

// CREATE loyalty record
const createLoyaltyRecord = async (loyaltyData) => {
  try {
    console.log(
      `[LOYALTY_SERVICE] Creating loyalty record for customerId=${loyaltyData?.customerid}`
    );

    if (!loyaltyData?.customerid?.trim()) {
      throw new Error('Customer ID is required');
    }

    const customer = await customerModel.getCustomerById(
      loyaltyData.customerid
    );

    if (!customer) {
      throw new Error('Customer not found');
    }

    const loyalty = await loyaltyModel.createLoyaltyRecord(loyaltyData);

    console.log(
      `[LOYALTY_SERVICE] Loyalty record created successfully for customerId=${loyaltyData.customerid}`
    );

    return loyalty;
  } catch (error) {
    console.error(
      `[LOYALTY_SERVICE] Error creating loyalty record`,
      error
    );

    throw new Error(`Error creating loyalty record: ${error.message}`);
  }
};

const processLoyaltyEvent = async ({ eventId, customerId, type, payload }) => {
  try {
    if (!customerId?.trim()) {
      throw new Error('Customer ID is required');
    }

    if (!eventId?.trim()) {
      throw new Error('Event ID is required');
    }

    if (type !== 'PURCHASE') {
      throw new Error(`Unsupported loyalty event type: ${type}`);
    }

    const totalpoints =
      payload?.totalpoints ?? payload?.totalPoints ?? payload?.points ?? 0;

    if (totalpoints === undefined || totalpoints === null || totalpoints === '') {
      throw new Error('Total points are required');
    }

    const normalizedTotalPoints = Number(totalpoints);

    if (Number.isNaN(normalizedTotalPoints)) {
      throw new Error('Total points must be a number');
    }

    if (normalizedTotalPoints < 0) {
      throw new Error('Total points cannot be negative');
    }

    // Check whether this event was already processed
    const existingEvent = await loyaltyModel.findProcessedLoyaltyEvent(eventId);

    if (existingEvent) {
      console.warn('[LOYALTY_SERVICE] Duplicate loyalty event detected and skipped', {
        eventId,
        customerId,
      });

      return {
        duplicate: true,
        skipped: true,
        eventId,
        customerId,
        type,
      };
    }

    const result = await updateLoyaltyTier(customerId, normalizedTotalPoints);
    await loyaltyModel.recordProcessedLoyaltyEvent(eventId);

    return {
      duplicate: false,
      eventId,
      customerId,
      type,
      payload: { totalpoints: normalizedTotalPoints, customerId },
      result,
  };
  } catch (error) {
    console.error('[LOYALTY_SERVICE] Error processing purchase event', {
      eventId,
      customerId,
      type,
      error: error.message,
    });

    throw error;
  }
};


module.exports = {
  generateLoyaltyEventId,
  processPurchaseEvent,
  updateLoyaltyTier,
  getLoyaltySummary,
  createLoyaltyRecord,
  processLoyaltyEvent,
};