const prisma = require('../utils/db');

const getLoyaltyByCustomerId = async (customerid) => {
  try {
    return await prisma.loyalty.findFirst({
      where: { customerid },
      orderBy: { createdat: 'desc' },
    });
  } catch (error) {
    throw new Error(`Error fetching loyalty record: ${error.message}`);
  }
};

const getLoyaltySummaryByCustomerId = async (customerid) => {
  try {
    const loyaltyRecord = await prisma.loyalty.findFirst({
      where: { customerid },
      include: { customer: true },
      orderBy: { createdat: 'desc' },
    });

    if (!loyaltyRecord) {
      return null;
    }

    return {
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
  } catch (error) {
    throw new Error(`Error fetching loyalty summary: ${error.message}`);
  }
};

const getTotalPurchaseAmount = async (customerid) => {
  try {
    const result = await prisma.orderheader.aggregate({
      where: { customerid },
      _sum: { totalamount: true },
    });

    return Number(result._sum.totalamount || 0);
  } catch (error) {
    throw new Error(`Error calculating total purchase amount: ${error.message}`);
  }
};

const updateLoyaltyTier = async (customerid, newTier) => {
  try {
    const existingLoyalty = await prisma.loyalty.findFirst({
      where: { customerid },
      orderBy: { createdat: 'desc' },
    });

    if (existingLoyalty) {
      return await prisma.loyalty.update({
        where: { loyaltyid: existingLoyalty.loyaltyid },
        data: {
          tier: newTier,
          updatedat: new Date(),
        },
      });
    }

    return await prisma.loyalty.create({
      data: {
        customerid,
        tier: newTier,
        totalpoints: 0,
        isactive: true,
        lastearnedat: new Date(),
        lastredeemedat: new Date(),
        createdat: new Date(),
        updatedat: new Date(),
      },
    });
  } catch (error) {
    throw new Error(`Error updating loyalty tier: ${error.message}`);
  }
};

const createLoyaltyRecord = async (loyaltyData) => {
  try {
    const { customerid, tier, totalpoints, isactive } = loyaltyData;
    return await prisma.loyalty.create({
      data: {
        customerid,
        tier: tier || 'BRONZE',
        totalpoints: totalpoints ?? 0,
        isactive: isactive ?? true,
        lastearnedat: new Date(),
        lastredeemedat: new Date(),
        createdat: new Date(),
        updatedat: new Date(),
      },
    });
  } catch (error) {
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