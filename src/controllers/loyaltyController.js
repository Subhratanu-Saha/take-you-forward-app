const loyaltyService = require('../services/loyaltyService');

const getLoyaltyErrorStatus = (error) => {
  const message = error?.message || '';

  if (message.includes('Customer ID is required')) return 400;
  if (message.includes('Customer not found')) return 404;
  return 500;
};

// GET loyalty summary by customer ID
const getLoyaltySummary = async (req, res) => {
  try {
     console.log(`[LOYALTY_CONTROLLER] GET loyalty summary request for customerId=${req.params.customerId}`);


    const summary = await loyaltyService.getLoyaltySummary(req.params.customerId);

    if (!summary) {
      console.warn(`[LOYALTY_CONTROLLER] No loyalty record found for customerId=${req.params.customerId}`);
    } else {
      console.log(`[LOYALTY_CONTROLLER] Loyalty summary found for customerId=${req.params.customerId}`);
 }

    return res.status(200).json({
      success: true,
      message: 'Loyalty summary fetched successfully',
      data: summary,
    });
  } catch (error) {
     console.error(`[LOYALTY_CONTROLLER] Failed to fetch loyalty summary for customerId=${req.params.customerId}:`, error);
     
     const status = getLoyaltyErrorStatus(error);
     
     return res.status(status).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

// UPDATE loyalty tier
const updateLoyaltyTier = async (req, res) => {
  try {

    console.log(`[LOYALTY_CONTROLLER] PUT loyalty tier update request for customerId=${req.params.customerId}`);

    const result = await loyaltyService.updateLoyaltyTier(req.params.customerId);

    console.log(`[LOYALTY_CONTROLLER] Loyalty tier updated successfully for customerId=${req.params.customerId}`);

    return res.status(200).json({
      success: true,
      message: 'Loyalty tier updated successfully',
      data: result,
    });
  } catch (error) {
    console.error(`[LOYALTY_CONTROLLER] Failed to update loyalty tier for customerId=${req.params.customerId}`, error);

    const status = getLoyaltyErrorStatus(error);

     return res.status(status).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }

};



// CREATE new loyalty record
const createLoyaltyRecord = async (req, res) => {
  try {
    const { customerid } = req.body || {};
    console.log(`[LOYALTY_CONTROLLER] POST loyalty record request for customerId=${customerid}`);

    // Validate required fields before processing
    if (!customerid || (typeof customerid === 'string' && !customerid.trim())) {
      console.warn('[LOYALTY_CONTROLLER] Customer ID is missing in create loyalty request');
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required',
      });
    }

    // Call service layer to create loyalty record
    const loyalty = await loyaltyService.createLoyaltyRecord(req.body);

    console.log(`[LOYALTY_CONTROLLER] Loyalty record created successfully for customerId=${customerid}`);


    // Return 201 Created on success
    return res.status(201).json({
      success: true,
      message: 'Loyalty record created successfully',
      data: loyalty,
    });
  } catch (error) {
    console.error(`[LOYALTY_CONTROLLER] Failed to create loyalty record for customerId=${req.body?.customerid}`, error);

    const status = getLoyaltyErrorStatus(error);

    // Handle unexpected exceptions with 500 Internal Server Error
    return res.status(status).json({
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