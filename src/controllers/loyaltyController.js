const loyaltyService = require('../services/loyaltyService');

// GET loyalty summary by customer ID
const getLoyaltySummary = async (req, res) => {
  try {
    const summary = await loyaltyService.getLoyaltySummary(req.params.customerId);

    res.status(200).json({
      success: true,
      message: 'Loyalty summary fetched successfully',
      data: summary,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE loyalty tier
const updateLoyaltyTier = async (req, res) => {
  try {
    const result = await loyaltyService.updateLoyaltyTier(req.params.customerId);

    res.status(200).json({
      success: true,
      message: 'Loyalty tier updated successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// CREATE new loyalty record
const createLoyaltyRecord = async (req, res) => {
  try {
    const { customerid } = req.body || {};

    // Validate required fields before processing
    if (!customerid || (typeof customerid === 'string' && !customerid.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required',
      });
    }

    // Call service layer to create loyalty record
    const loyalty = await loyaltyService.createLoyaltyRecord(req.body);

    // Return 201 Created on success
    return res.status(201).json({
      success: true,
      message: 'Loyalty record created successfully',
      data: loyalty,
    });
  } catch (error) {
    // Handle unexpected exceptions with 500 Internal Server Error
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

module.exports = {
  getLoyaltySummary,
  updateLoyaltyTier,
  createLoyaltyRecord,
};