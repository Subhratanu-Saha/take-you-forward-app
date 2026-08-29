const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const validatePromotionalCampaign = (req, res, next) => {
  if (!isPlainObject(req.body)) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Request body must be a JSON object'],
    });
  }

  const { campaignId, startDate, endDate, subject, promoCode, discountPercentage, campaignHeadline, storeUrl, logoUrl, companyAddress, supportUrl, unsubscribeUrl } = req.body;
  const errors = [];

  if (typeof campaignId !== 'string' || !campaignId.trim()) {
    errors.push('Campaign ID is required');
  } else if (campaignId.trim().length > 100) {
    errors.push('Campaign ID must not exceed 100 characters');
  }

  for (const [name, value] of [['startDate', startDate], ['endDate', endDate]]) {
    if (value !== undefined && (typeof value !== 'string' || Number.isNaN(new Date(value).getTime()))) {
      errors.push(`${name} must be a valid ISO date`);
    }
  }

  if (subject !== undefined && (typeof subject !== 'string' || !subject.trim() || subject.trim().length > 200)) {
    errors.push('Subject must be a non-empty string of no more than 200 characters');
  }

  if (typeof promoCode !== 'string' || !promoCode.trim()) {
  errors.push('Promo code is required');
} else if (promoCode.trim().length > 50) {
  errors.push('Promo code must not exceed 50 characters');
}

if (
  typeof discountPercentage !== 'number' ||
  !Number.isFinite(discountPercentage) ||
  discountPercentage < 0 ||
  discountPercentage > 100
) {
  errors.push('Discount percentage must be between 0 and 100');
}

if (typeof campaignHeadline !== 'string' || !campaignHeadline.trim()) {
  errors.push('Campaign headline is required');
} else if (campaignHeadline.trim().length > 200) {
  errors.push('Campaign headline must not exceed 200 characters');
}

if (typeof storeUrl !== 'string' || !storeUrl.trim()) {
  errors.push('Store URL is required');
} else {
  try {
    const url = new URL(storeUrl.trim());
    if (url.protocol !== 'https:') {
      errors.push('Store URL must be a valid HTTPS URL');
    }
  } catch {
    errors.push('Store URL must be a valid HTTPS URL');
  }
}


 // Optional URL validation
  for (const [field, value] of [
    ['logoUrl', logoUrl],
    ['supportUrl', supportUrl],
    ['unsubscribeUrl', unsubscribeUrl],
  ]) {
    if (value !== undefined && value !== null && value !== '') {
      try {
        const url = new URL(value.trim());
        if (url.protocol !== 'https:') {
          errors.push(`${field} must be a valid HTTPS URL`);
        }
      } catch {
        errors.push(`${field} must be a valid HTTPS URL`);
      }
    }
  }

  // Return errors if validation failed
  if (errors.length) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  req.body = {
    ...req.body,
    campaignId: campaignId.trim(),
    subject: subject?.trim(),
    promoCode: promoCode.trim(),
    discountPercentage,
    campaignHeadline: campaignHeadline.trim(),
    storeUrl: storeUrl.trim(),
    logoUrl: logoUrl?.trim(),
    companyAddress: companyAddress?.trim(),
    supportUrl: supportUrl?.trim(),
    unsubscribeUrl: unsubscribeUrl?.trim(),

  };
  next();
};

module.exports = { validatePromotionalCampaign };
