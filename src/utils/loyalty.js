const { LOYALTY_TIER, LOYALTY_TIER_THRESHOLD } = require('../constants/constant');

const calculateTier = (totalPurchaseAmount) => {
  if (totalPurchaseAmount >= LOYALTY_TIER_THRESHOLD.GOLD) {
    return LOYALTY_TIER.GOLD;
  }

  if (totalPurchaseAmount >= LOYALTY_TIER_THRESHOLD.SILVER) {
    return LOYALTY_TIER.SILVER;
  }

  return LOYALTY_TIER.BRONZE;
};

module.exports = {
  calculateTier,
};