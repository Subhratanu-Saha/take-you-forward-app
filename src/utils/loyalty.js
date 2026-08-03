const { LOYALTY_TIER, LOYALTY_TIER_THRESHOLD } = require('../constants/constant');

const normalizeLoyaltyTier = (tier) => {
  const normalizedTier = typeof tier === 'string' ? tier.trim().toLowerCase() : '';

  switch (normalizedTier) {
    case 'gold':
      return LOYALTY_TIER.GOLD;
    case 'silver':
      return LOYALTY_TIER.SILVER;
    case 'bronze':
    default:
      return LOYALTY_TIER.BRONZE;
  }
};

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
  normalizeLoyaltyTier,
};