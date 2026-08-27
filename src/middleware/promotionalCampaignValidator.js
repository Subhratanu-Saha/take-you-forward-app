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

  const { campaignId, startDate, endDate, subject } = req.body;
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

  if (errors.length) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  req.body = {
    ...req.body,
    campaignId: campaignId.trim(),
    subject: subject?.trim(),
  };
  next();
};

module.exports = { validatePromotionalCampaign };
