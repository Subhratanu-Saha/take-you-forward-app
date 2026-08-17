const loyaltyService = require('../services/loyaltyService');

// GET loyalty summary by customer ID
const getLoyaltySummary = async (req, res) => {
  try {
    console.log(`[LOYALTY_CONTROLLER] GET loyalty summary request for customerId=${req.params.customerId}`);


    const summary = await loyaltyService.getLoyaltySummary(req.params.customerId);

    if (!summary) {
      console.warn(`[LOYALTY_CONTROLLER] No loyalty record found for customerId=${req.params.customerId}`);
    } else {
      console.log(`[LOYALTY_CONTROLLER] Loyalty summary found for customerId=${req.params.customerId}`,

      );
    }

    res.status(200).json({
      success: true,
      message: 'Loyalty summary fetched successfully',
      data: summary,
    });
  } catch (error) {
    console.error(`[LOYALTY_CONTROLLER] Failed to fetch loyalty summary for customerId=${req.params.customerId}:`, error);

    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE loyalty tier
const updateLoyaltyTier = async (req, res) => {
  try {
    const customerid = req.params?.customerId;
    const { totalpoints } = req.body;
    console.log(`customerid`, customerid);
    console.log(`totalpoints`, totalpoints);

    console.log(`[LOYALTY_CONTROLLER] PUT loyalty tier update request for customerId=${customerid}`);

    const result = await loyaltyService.updateLoyaltyTier(customerid, totalpoints);

    console.log(`[LOYALTY_CONTROLLER] Loyalty tier updated successfully for customerId=${req.params.customerId}`);

    res.status(200).json({
      success: true,
      message: 'Loyalty tier updated successfully',
      data: result,
    });
  } catch (error) {
    console.error(`[LOYALTY_CONTROLLER] Failed to update loyalty tier for customerId=${req.params.customerId}`, error);

    if (error.message?.includes('Customer not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message?.includes('Customer ID is required')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// CREATE new loyalty record
const createLoyaltyRecord = async (req, res) => {
  try {
    const urlCustomerId = req.params?.customerId;
    const bodyCustomerId = req.body?.customerid;

    // Validate that if both URL and body customer IDs are provided, they must match
    if (bodyCustomerId && urlCustomerId && bodyCustomerId.trim() !== urlCustomerId.trim()) {
      console.warn(
        `[LOYALTY_CONTROLLER] Customer ID mismatch: URL=${urlCustomerId}, Body=${bodyCustomerId}`
      );
      return res.status(400).json({
        success: false,
        message: 'Customer ID in URL and request body do not match',
      });
    }

    const customerid = bodyCustomerId?.trim() || urlCustomerId?.trim();

    console.log(`[LOYALTY_CONTROLLER] POST loyalty record request for customerId=${customerid}`);

    // Validate required fields before processing
    if (!customerid) {
      console.warn('[LOYALTY_CONTROLLER] Customer ID is missing in create loyalty request');
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required',
      });
    }

    const loyaltyData = { ...req.body, customerid };

    // Call service layer to create loyalty record
    const loyalty = await loyaltyService.createLoyaltyRecord(loyaltyData);

    console.log(`[LOYALTY_CONTROLLER] Loyalty record created successfully for customerId=${customerid}`);

    // Return 201 Created on success
    return res.status(201).json({
      success: true,
      message: 'Loyalty record created successfully',
      data: loyalty,
    });
  } catch (error) {
    console.error(`[LOYALTY_CONTROLLER] Failed to create loyalty record for customerId=${req.params?.customerId || req.body?.customerid}`, error);

    if (error.message?.includes('Customer not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    if (error.message?.includes('Customer ID is required')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    // Handle unexpected exceptions with 500 Internal Server Error
    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};module.exports = {
  getLoyaltySummary,
  updateLoyaltyTier,
  createLoyaltyRecord,
};