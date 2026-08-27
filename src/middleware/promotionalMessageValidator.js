const CUSTOMER_ID_REGEX = /^CUST-\d+-[A-Z0-9]{10}$/;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const validateCreatePromotionalMessage = (req, res, next) => {
  if (!isPlainObject(req.body)) {
    console.warn('[PROMOTIONAL_VALIDATOR] Request body must be a JSON object');
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['Request body must be a JSON object'],
    });
  }

  const errors = [];
  const rawCustomerId = req.body.customerid ?? req.body.customerId;
  const { title, message, campaignHeadline, promoCode, discountPercentage, storeUrl, expirationDate } = req.body;

  let normalizedCustomerId = '';
  let trimmedTitle = '';
  let trimmedMessage = '';

  if (rawCustomerId === undefined || rawCustomerId === null) {
    errors.push('Customer ID is required');
  } else if (typeof rawCustomerId !== 'string') {
    errors.push('Customer ID must be a string');
  } else {
    normalizedCustomerId = rawCustomerId.trim();

    if (!normalizedCustomerId) {
      errors.push('Customer ID cannot be empty');
    } else if (!CUSTOMER_ID_REGEX.test(normalizedCustomerId)) {
      errors.push(
        'Customer ID format is invalid. Expected format: CUST-{timestamp}-{10 alphanumeric characters}'
      );
    }
  }

  if (title === undefined) {
    errors.push('Title is required');
  } else if (typeof title !== 'string') {
    errors.push('Title must be a string');
  } else {
    trimmedTitle = title.trim();

    if (!trimmedTitle) {
      errors.push('Title cannot be empty');
    } else if (trimmedTitle.length > 120) {
      errors.push('Title must not exceed 120 characters');
    }
  }

  if (message === undefined) {
    errors.push('Message is required');
  } else if (typeof message !== 'string') {
    errors.push('Message must be a string');
  } else {
    trimmedMessage = message.trim();

    if (!trimmedMessage) {
      errors.push('Message cannot be empty');
    } else if (trimmedMessage.length > 5000) {
      errors.push('Message must not exceed 5000 characters');
    }
  }

  // -----------------------------
  // Campaign Headline validation
  // -----------------------------

  if (campaignHeadline !== undefined) {
    if (typeof campaignHeadline !== 'string') {
      errors.push('Campaign headline must be a string');
    } else if (campaignHeadline.trim().length > 200) {
      errors.push(
        'Campaign headline must not exceed 200 characters'
      );
    }
  }

  // -----------------------------
  // Promo Code validation
  // -----------------------------

  if (promoCode !== undefined) {
    if (typeof promoCode !== 'string') {
      errors.push('Promo code must be a string');
    } else if (!promoCode.trim()) {
      errors.push('Promo code cannot be empty');
    } else if (promoCode.trim().length > 50) {
      errors.push(
        'Promo code must not exceed 50 characters'
      );
    }
  }

  // -----------------------------
  // Discount Percentage validation
  // -----------------------------

  if (discountPercentage !== undefined) {
    if (
      typeof discountPercentage !== 'number' ||
      !Number.isFinite(discountPercentage) ||
      discountPercentage < 0 ||
      discountPercentage > 100
    ) {
      errors.push(
        'Discount percentage must be between 0 and 100'
      );
    }
  }

  // -----------------------------
  // Store URL validation
  // -----------------------------

  if (storeUrl !== undefined) {
    if (typeof storeUrl !== 'string') {
      errors.push('Store URL must be a string');
    } else {
      try {
        const normalizedStoreUrl = storeUrl.trim();
        const parsedUrl = new URL(normalizedStoreUrl);

        if (parsedUrl.protocol !== 'https:') {
          errors.push('Store URL must be a valid HTTPS URL');
        }
      } catch (error) {
        errors.push('Store URL must be a valid HTTPS URL');
      }
    }
  }

  // -----------------------------
  // Expiration Date validation
  // -----------------------------

  if (expirationDate !== undefined) {
  if (typeof expirationDate !== 'string') {
    errors.push('Expiration date must be a valid date');
  } else {
    const parsedDate = new Date(expirationDate);

    if (Number.isNaN(parsedDate.getTime())) {
      errors.push('Expiration date must be a valid date');
    } else if (parsedDate <= new Date()) {
      errors.push('Expiration date must be in the future');
    }
  }
}

  // -----------------------------
  // Return validation errors
  // -----------------------------

  if (errors.length > 0) {
    console.warn(`[PROMOTIONAL_VALIDATOR] Validation failed for customer=${normalizedCustomerId || 'unknown'}: ${errors.join('; ')}`);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  req.body = {
    ...req.body,
    customerid: normalizedCustomerId,
    title: trimmedTitle,
    message: trimmedMessage,
    ...(campaignHeadline !== undefined && {
      campaignHeadline: campaignHeadline.trim(),
    }),

    ...(promoCode !== undefined && {
      promoCode: promoCode.trim(),
    }),

    ...(discountPercentage !== undefined && {
      discountPercentage,
    }),

    ...(storeUrl !== undefined && {
      storeUrl: storeUrl.trim(),
    }),

    ...(expirationDate !== undefined && {
      expirationDate: new Date(expirationDate).toISOString(),
    }),
  };

  console.info(`[PROMOTIONAL_VALIDATOR] Request validated for customer=${normalizedCustomerId}`);
  next();
};

module.exports = {
  validateCreatePromotionalMessage,
};