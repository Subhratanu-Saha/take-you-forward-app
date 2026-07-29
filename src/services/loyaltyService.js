const loyaltyModel = require('../models/loyalty');
const customerModel = require('../models/customer');
const { calculateTier } = require('../utils/loyalty');

const updateLoyaltyTier = async (customerid) => {
  try {
    console.log(`[LOYALTY_SERVICE] Starting loyalty tier update for customerId=${customerid}`);

    if (!customerid?.trim()) {
      console.warn('[LOYALTY_SERVICE] Customer ID is missing');
      throw new Error('Customer ID is required');
    }

    const customer = await customerModel.getCustomerById(customerid);
    if (!customer) {
      console.warn(`[LOYALTY_SERVICE] Customer not found for customerId=${customerid}`);
      throw new Error('Customer not found');
    }

    // Get total purchase amount from all orders
    const totalPurchaseAmount = await loyaltyModel.getTotalPurchaseAmount(customerid);

    // Calculating tier based on purchase amount
    const newTier = calculateTier(totalPurchaseAmount);

     console.log(`[LOYALTY_SERVICE] Calculated new tier=${newTier} for customerId=${customerid}`, {
      totalPurchaseAmount,
    });


    // Update loyalty record with new tier
    const result = await loyaltyModel.updateLoyaltyTier(customerid, newTier);

    console.log(`[LOYALTY_SERVICE] Loyalty tier updated successfully for customerId=${customerid}`, {
      tier: result?.tier,
    });
    return result;
  } catch (error) {
    console.error(`[LOYALTY_SERVICE] Error while updating loyalty tier for customerId=${customerid}`, error);
    throw new Error(`Error updating loyalty tier: ${error.message}`);
  }
};

const getLoyaltySummary = async (customerid) => {
  try {
    console.log(`[LOYALTY_SERVICE] Fetching loyalty summary for customerId=${customerid}`);
  if (!customerid?.trim()) {
    console.warn('[LOYALTY_SERVICE] Customer ID is missing');
    throw new Error('Customer ID is required');
  }

  const customer = await customerModel.getCustomerById(customerid);
  if (!customer) {
    console.warn(`[LOYALTY_SERVICE] Customer not found for customerId=${customerid}`);
    throw new Error('Customer not found');
  }

  const summary = await loyaltyModel.getLoyaltySummaryByCustomerId(customerid);

  if (!summary) {
    console.warn(`[LOYALTY_SERVICE] No loyalty record found for customerId=${customerid}`);
    return null;
  }

  console.log(`[LOYALTY_SERVICE] Loyalty summary fetched successfully for customerId=${customerid}`, {
      loyaltyid: summary?.loyaltyid,
      tier: summary?.tier,
    });
    return summary;
  } catch (error) {
    console.error(`[LOYALTY_SERVICE] Error while fetching loyalty summary for customerId=${customerid}`, error);
    throw new Error(`Error fetching loyalty summary: ${error.message}`);
  }
};

const createLoyaltyRecord = async (loyaltyData) => {
  try {
   console.log(`[LOYALTY_SERVICE] Creating loyalty record for customerId=${loyaltyData?.customerid}`);

  if (!loyaltyData || !loyaltyData.customerid?.trim()) {
    console.warn('[LOYALTY_SERVICE] Customer ID is missing ');
    throw new Error('Customer ID is required');
  }

  const customer = await customerModel.getCustomerById(loyaltyData.customerid);
  if (!customer) {
    console.warn(`[LOYALTY_SERVICE] Customer not found for customerId=${loyaltyData.customerid}`);
    throw new Error('Customer not found');
  }

  const loyalty = await loyaltyModel.createLoyaltyRecord(loyaltyData);

   console.log(`[LOYALTY_SERVICE] Loyalty record created successfully for customerId=${loyaltyData.customerid}`, {
      loyaltyid: loyalty?.loyaltyid,
    });
    return loyalty;
  } catch (error) {
    console.error(`[LOYALTY_SERVICE] Error while creating loyalty record for customerId=${loyaltyData?.customerid}`, error);
    throw new Error(`Error creating loyalty record: ${error.message}`);
  }
};

module.exports = {
  getLoyaltySummary,
  updateLoyaltyTier,
  calculateTier,
  createLoyaltyRecord,
};
