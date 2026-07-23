const loyaltyService = require('../services/loyaltyService');

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

module.exports = {
  getLoyaltySummary,
  updateLoyaltyTier,
};