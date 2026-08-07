const loyaltyModel = require('../models/loyalty');
const customerModel = require('../models/customer');
const { calculateTier } = require('../utils/loyalty');

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

module.exports = {
  updateLoyaltyTier,
  getLoyaltySummary,
  createLoyaltyRecord,
};