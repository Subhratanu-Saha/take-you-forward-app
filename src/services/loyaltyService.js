const loyaltyModel = require('../models/loyalty');
const customerModel = require('../models/customer');

// Function to calculate tier based on total purchase amount
const calculateTier = (totalPurchaseAmount) => {
  if (totalPurchaseAmount >= 15000) {
    return 'Gold';
  } else if (totalPurchaseAmount >= 5001) {
    return 'Silver';
  } else {
    return 'Bronze';
  }
};

const updateLoyaltyTier = async (customerid) => {
  try {
    const customer = await customerModel.getCustomerById(customerid);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get total purchase amount from all orders
    const totalPurchaseAmount = await loyaltyModel.getTotalPurchaseAmount(customerid);

    // Calculating tier based on purchase amount
    const newTier = calculateTier(totalPurchaseAmount);

    // Update loyalty record with new tier
    return await loyaltyModel.updateLoyaltyTier(customerid, newTier);
  } catch (error) {
    throw new Error(`Error updating loyalty tier: ${error.message}`);
  }
};

const getLoyaltySummary = async (customerid) => {
  if (!customerid?.trim()) {
    throw new Error('Customer ID is required');
  }

  const customer = await customerModel.getCustomerById(customerid);
  if (!customer) {
    throw new Error('Customer not found');
  }

  return await loyaltyModel.getLoyaltySummaryByCustomerId(customerid);
};

module.exports = {
  getLoyaltySummary,
  updateLoyaltyTier,
  calculateTier,
};