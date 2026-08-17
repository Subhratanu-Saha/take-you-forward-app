const prisma = require('../utils/db');
const { normalizeLoyaltyTier, calculateTier } = require('../utils/loyalty');

const getLoyaltyByCustomerId = async (customerid) => {
  try {
    console.log(`[LOYALTY_MODEL] Fetching loyalty record for customerId=${customerid}`);

    const loyaltyRecord = await prisma.loyalty.findFirst({
      where: { customerid },
      orderBy: { createdat: 'desc' },
    });

    if (!loyaltyRecord) {
      console.warn(`[LOYALTY_MODEL] No loyalty record found for customerId=${customerid}`);
      return null;
    }

    console.log(`[LOYALTY_MODEL] Loyalty record found for customerId=${customerid}`, {
      loyaltyid: loyaltyRecord.loyaltyid,
    });


    return loyaltyRecord;
  } catch (error) {
    console.error(`[LOYALTY_MODEL] Failed to fetch loyalty record for customerId=${customerid}`, error);
    throw new Error(`Error fetching loyalty record: ${error.message}`);
  }
};

const getLoyaltySummaryByCustomerId = async (customerid) => {
  try {
    console.log(`[LOYALTY_MODEL] Building loyalty summary for customerId=${customerid}`);


    const loyaltyRecord = await prisma.loyalty.findFirst({
      where: { customerid },
      include: { customer: true },
      orderBy: { createdat: 'desc' },
    });

    if (!loyaltyRecord) {
      console.warn(`[LOYALTY_MODEL] No loyalty summary available for customerId=${customerid}`);
      return null;
    }

    const summary = {
      loyaltyid: loyaltyRecord.loyaltyid,
      customerid: loyaltyRecord.customerid,
      tier: loyaltyRecord.tier,
      totalpoints: loyaltyRecord.totalpoints,
      isactive: loyaltyRecord.isactive,
      lastearnedat: loyaltyRecord.lastearnedat,
      lastredeemedat: loyaltyRecord.lastredeemedat,
      createdat: loyaltyRecord.createdat,
      updatedat: loyaltyRecord.updatedat,
      customername: loyaltyRecord.customer
        ? `${loyaltyRecord.customer.firstname} ${loyaltyRecord.customer.lastname || ''}`.trim()
        : null,
    };

    console.log(`[LOYALTY_MODEL] Loyalty summary generated for customerId=${customerid}`, {
      loyaltyid: summary.loyaltyid,
      tier: summary.tier,
      totalpoints: summary.totalpoints,
    });

    return summary;
  } catch (error) {
    console.error(`[LOYALTY_MODEL] Failed to build loyalty summary for customerId=${customerid}`, error);
    throw new Error(`Error fetching loyalty summary: ${error.message}`);
  }
};

const getTotalPurchaseAmount = async (customerid) => {
  try {
    console.log(`[LOYALTY_MODEL] Calculating total purchase amount for customerId=${customerid}`);

    const result = await prisma.orderheader.aggregate({
      where: { customerid },
      _sum: { totalamount: true },
    });

    const totalPurchaseAmount = Number(result._sum.totalamount || 0);

    console.log(`[LOYALTY_MODEL] Total purchase amount calculated for customerId=${customerid}`, {
      totalPurchaseAmount,
    });

    return totalPurchaseAmount;
  } catch (error) {
    console.error(`[LOYALTY_MODEL] Failed to calculate total purchase amount for customerId=${customerid}`, error);
    throw new Error(`Error calculating total purchase amount: ${error.message}`);
  }
};

const updateLoyaltyTier = async (customerid, totalpoints, newTier) => {
  try {
    const incomingPoints = Number(totalpoints || 0);
    const existingLoyalty = await prisma.loyalty.findFirst({
      where: { customerid },
      orderBy: { createdat: 'desc' },
    });

    const cumulativePoints = existingLoyalty
      ? Number(existingLoyalty.totalpoints || 0) + incomingPoints
      : incomingPoints;

    const normalizedTier = normalizeLoyaltyTier(newTier || calculateTier(cumulativePoints));

    console.log(`[LOYALTY_MODEL] Updating loyalty tier for customerId=${customerid} to ${normalizedTier} with totalpoints=${cumulativePoints}`);

    if (existingLoyalty) {
      const updatedRecord = await prisma.loyalty.update({
        where: { loyaltyid: existingLoyalty.loyaltyid },
        data: {
          totalpoints: cumulativePoints,
          tier: normalizedTier,
          updatedat: new Date(),
        },
      });

      console.log(`[LOYALTY_MODEL] Updated existing loyalty record for customerId=${customerid}`, {
        loyaltyid: updatedRecord.loyaltyid,
        tier: updatedRecord.tier,
        totalpoints: updatedRecord.totalpoints,
      });

      return updatedRecord;
    }

    const createdRecord = await prisma.loyalty.create({
      data: {
        customerid,
        tier: normalizedTier,
        totalpoints: cumulativePoints,
        isactive: true,
        lastearnedat: new Date(),
        lastredeemedat: new Date(),
        createdat: new Date(),
        updatedat: new Date(),
      },
    });
    console.log(`[LOYALTY_MODEL] Created new loyalty record for customerId=${customerid}`, {
      loyaltyid: createdRecord.loyaltyid,
      tier: createdRecord.tier,
      totalpoints: createdRecord.totalpoints,
    });

    return createdRecord;
  } catch (error) {
    console.error(`[LOYALTY_MODEL] Failed to update loyalty tier for customerId=${customerid}`, error);
    throw new Error(`Error updating loyalty tier: ${error.message}`);
  }
};

const createLoyaltyRecord = async (loyaltyData) => {
  try {
    const { customerid, totalpoints, isactive } = loyaltyData;
    const calculatedTier = calculateTier(Number(totalpoints ?? 0));

    console.log(`[LOYALTY_MODEL] Creating loyalty record for customerId=${customerid}`, {
      tier: calculatedTier,
      totalpoints: totalpoints ?? 0,
      isactive: isactive ?? true,
    });

    const createdRecord = await prisma.loyalty.create({
      data: {
        customerid,
        tier: calculatedTier,
        totalpoints: Number(totalpoints ?? 0),
        isactive: isactive ?? true,
        lastearnedat: new Date(),
        lastredeemedat: new Date(),
        createdat: new Date(),
        updatedat: new Date(),
      },
    });

    console.log(`[LOYALTY_MODEL] Loyalty record created successfully for customerId=${customerid}`, {
      loyaltyid: createdRecord.loyaltyid,
    });

    return createdRecord;
  } catch (error) {
    console.error(`[LOYALTY_MODEL] Failed to create loyalty record for customerId=${loyaltyData?.customerid}`, error);
    throw new Error(`Error creating loyalty record: ${error.message}`);
  }
};

module.exports = {
  getLoyaltyByCustomerId,
  getLoyaltySummaryByCustomerId,
  getTotalPurchaseAmount,
  updateLoyaltyTier,
  createLoyaltyRecord,
};