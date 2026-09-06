const loyaltyModel = require('../models/loyalty');
const customerModel = require('../models/customer');
const { calculateTier } = require('../utils/loyalty');
const prisma = require('../utils/db');
const auditService = require('./auditService');

const generateLoyaltyEventId = ({ customerid, orderid }) => {
  const safeCustomerId = customerid || 'unknown';
  const safeOrderId = orderid || 'order';

  return `LOY-${safeCustomerId}-${safeOrderId}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

const processPurchaseEvent = async ({ customerid, orderid, totalamount, eventId, points, transactionClient = prisma }) => {
  const normalizedEventId = (eventId || points?.eventId || '').toString().trim() || generateLoyaltyEventId({ customerid, orderid });
  const normalizedCustomerId = customerid?.trim();
  const normalizedOrderId = orderid?.trim() || `PURCHASE-${normalizedCustomerId || 'unknown'}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;

  const earnedPoints = Number(points ?? Math.max(0, Number(totalamount ?? 0)));

  if (!Number.isFinite(earnedPoints) || earnedPoints < 0) {
    throw new Error('Earned points must be a valid non-negative number');
  }

  if (!normalizedCustomerId) {
    throw new Error('Customer ID is required');
  }

  const existingEvent = await loyaltyModel.findProcessedLoyaltyEvent(normalizedEventId, transactionClient);

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
  const previousTier = existingLoyalty?.tier || null;
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

   if (nextTier !== previousTier) {
    await auditService.recordAuditLog(transactionClient, {
      entityname: "LOYALTY",
      entityid: String(updatedOrCreatedLoyalty.loyaltyid),
      action: "TIER_UPGRADED",
      changedfields: ["tier", "totalpoints"],
      oldvalues: {
        tier: previousTier,
        totalpoints: currentPoints,
      },
      newvalues: {
        tier: nextTier,
        totalpoints: nextTotalPoints,
        orderid: normalizedOrderId,
        eventid: normalizedEventId,
        pointsEarned: earnedPoints,
      },
     
    });
  

  console.info(`[LOYALTY_AUDIT] Tier changed from ${previousTier} to ${nextTier} for customer=${normalizedCustomerId}`);

}


  // ✅ Step 4: AUDIT POINTS EARNED (now ledgerEntry exists)
  await auditService.recordAuditLog(transactionClient, {
    entityname: "LOYALTY",
    entityid: String(ledgerEntry.ledgerid),
    action: "POINTS_EARNED",
    changedfields: ['points', 'balanceafter'],
    oldvalues: {
      balanceafter: currentPoints,
    },
    newvalues: {
      points: earnedPoints,
      balanceafter: nextTotalPoints,
      orderid: normalizedOrderId,
      eventid: normalizedEventId,
      customerid: normalizedCustomerId,
    },
  });

  console.info(`[LOYALTY_AUDIT] Points earned audit created for customer=${normalizedCustomerId}`);

  // ✅ Step 5: Record processed event
  await loyaltyModel.recordProcessedLoyaltyEvent(normalizedEventId, transactionClient);

  console.info('[LOYALTY_SERVICE] Purchase event processed successfully', {
    eventId: normalizedEventId,
    customerid: normalizedCustomerId,
    orderid: normalizedOrderId,
    earnedPoints,
    totalpoints: nextTotalPoints,
    loyaltyId: updatedOrCreatedLoyalty.loyaltyid,
    ledgerId: ledgerEntry.ledgerid,
  }
);

  
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
const processRedemptionEvent = async ({
  customerid,
  orderid,
  eventId,
  points,
  transactionClient = prisma,
}) => {
  const normalizedCustomerId = customerid?.trim();
  const normalizedOrderId = orderid?.trim();

  const normalizedEventId =
    (eventId || '').toString().trim() ||
    `RED-${normalizedCustomerId}-${Date.now()}`;

  const redeemedPoints = Number(points);

  //  Validate customer ID
  if (!normalizedCustomerId) {
    throw new Error('Customer ID is required');
  }

  //  Validate redemption points
  if (!Number.isFinite(redeemedPoints) || redeemedPoints <= 0) {
    throw new Error(
      'Redeemed points must be a valid positive number'
    );
  }

  //  Check duplicate event
  const existingEvent =
    await loyaltyModel.findProcessedLoyaltyEvent(
      normalizedEventId,
      transactionClient
    );

  if (existingEvent) {
    return {
      duplicate: true,
      skipped: true,
      eventId: normalizedEventId,
      customerid: normalizedCustomerId,
    };
  }

  // Check customer
  const customer =
    await customerModel.getCustomerById(
      normalizedCustomerId
    );

  if (!customer) {
    throw new Error('Customer not found');
  }

  //  Get loyalty record
  const existingLoyalty =
    await transactionClient.loyalty.findFirst({
      where: {
        customerid: normalizedCustomerId,
      },
      orderBy: {
        createdat: 'desc',
      },
    });

  if (!existingLoyalty) {
    throw new Error('Loyalty record not found');
  }

  const currentPoints =
    Number(existingLoyalty.totalpoints ?? 0);

  //  Check available balance
  if (redeemedPoints > currentPoints) {
    throw new Error('Insufficient loyalty points');
  }

  const previousTier = existingLoyalty.tier;

  const nextTotalPoints =
    currentPoints - redeemedPoints;

  const nextTier =
    calculateTier(nextTotalPoints);

  //  Update loyalty balance
  const updatedLoyalty =
    await transactionClient.loyalty.update({
      where: {
        loyaltyid: existingLoyalty.loyaltyid,
      },

      data: {
        totalpoints: nextTotalPoints,
        tier: nextTier,
        lastredeemedat: new Date(),
        updatedat: new Date(),
      },
    });

  //  Create redemption ledger
  const ledgerEntry =
    await transactionClient.loyaltyledger.create({
      data: {
        customerid: normalizedCustomerId,

        orderid:
          normalizedOrderId ||
          `REDEMPTION-${Date.now()}`,

        eventid: normalizedEventId,

        ledgertype: 'REDEEMED',

        points: -redeemedPoints,

        balanceafter: nextTotalPoints,

        createdat: new Date(),

        updatedat: new Date(),
      },
    });

  // Create redemption audit
  await auditService.recordAuditLog(
    transactionClient,
    {
      entityname: 'LOYALTY',

      entityid: String(ledgerEntry.ledgerid),

      action: 'POINTS_REDEEMED',

      customerid: normalizedCustomerId,

      changedfields: [
        'points',
        'balanceafter',
      ],

      oldvalues: {
        balanceafter: currentPoints,
      },

      newvalues: {
        points: redeemedPoints,
        balanceafter: nextTotalPoints,
      },

      metadata: {
        orderid: normalizedOrderId,
        eventid: normalizedEventId,
      },
    }
  );

  //  Audit tier change if applicable
  if (nextTier !== previousTier) {
    await auditService.recordAuditLog(
      transactionClient,
      {
        entityname: 'LOYALTY',

        entityid: String(updatedLoyalty.loyaltyid),

        action: 'TIER_DOWNGRADED',

        customerid: normalizedCustomerId,

        changedfields: [
          'tier',
          'totalpoints',
        ],

        oldvalues: {
          tier: previousTier,
          totalpoints: currentPoints,
        },

        newvalues: {
          tier: nextTier,
          totalpoints: nextTotalPoints,
        },

        metadata: {
          reason: 'POINTS_REDEMPTION',
          eventid: normalizedEventId,
        },
      }
    );
  }

  //  Record processed event
  await loyaltyModel.recordProcessedLoyaltyEvent(
    normalizedEventId,
    transactionClient
  );

  return {
    duplicate: false,

    eventId: normalizedEventId,

    customerid: normalizedCustomerId,

    redeemedPoints,

    totalPoints: nextTotalPoints,

    loyalty: updatedLoyalty,

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

    if (type !== 'PURCHASE' && type !== 'REDEMPTION') {
      throw new Error(`Unsupported loyalty event type: ${type}`);
    }

   const points =
      payload?.points ??
      payload?.totalpoints ??
      payload?.totalPoints;

    if (
      points === undefined ||
      points === null ||
      points === ''
    ) {
      throw new Error('Points are required');
    }

    const normalizedPoints = Number(points);

    if (Number.isNaN(normalizedPoints)) {
      throw new Error('Points must be a number');
    }

    if (normalizedPoints < 0) {
      throw new Error('Points cannot be negative');
    }

   const result = await prisma.$transaction(async (tx) => {
    const existingEvent = await loyaltyModel.findProcessedLoyaltyEvent(eventId, tx);

    if (existingEvent) {
       return {
        duplicate: true,
        skipped: true,
        eventId,
        customerId,
        type,
      };
    }

    if (type === 'PURCHASE') {
      return await processPurchaseEvent({
        customerid: customerId,
        orderid: payload?.orderid || payload?.orderId,
        totalamount: payload?.totalamount || payload?.totalAmount,
        eventId,
      points: normalizedPoints,
      transactionClient: tx,
    });
  } 
    if (type === 'REDEMPTION') {
    return await processRedemptionEvent({
      customerid: customerId,
      orderid: payload?.orderid || payload?.orderId,
      eventId,
      points: normalizedPoints,
      transactionClient: tx,
    });
  }

  throw new Error(`Unsupported loyalty event type: ${type}`);
  });

    return {
      duplicate: result.duplicate ?? false,
      skipped: result.skipped ?? false,
      eventId,
      customerId,
      type,
      payload: { 
      totalpoints: normalizedPoints, customerId,
      orderid: payload?.orderid || payload?.orderId,
      },
      result,
  };
  } catch (error) {
    console.error('[LOYALTY_SERVICE] Error processing loyalty event', {
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
  processRedemptionEvent,
  updateLoyaltyTier,
  getLoyaltySummary,
  createLoyaltyRecord,
  processLoyaltyEvent,
};