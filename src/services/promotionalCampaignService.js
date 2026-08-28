const customerModel = require('../models/customer');
const promotionalMessageService = require('./promotionalMessageService');
const { PROMOTIONAL_ONBOARDING_EMAIL_SUBJECT } = require('../constants/constant');

const MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const parseDate = (value, fallback) => {
  if (value === undefined || value === null) {
    return fallback;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Campaign dates must be valid ISO date values');
  }
  return parsed;
};

const sendWeeklyPromotionalCampaign = async ({
  campaignId,
  startDate,
  endDate,
  subject = PROMOTIONAL_ONBOARDING_EMAIL_SUBJECT,
}) => {
  if (typeof campaignId !== 'string' || !campaignId.trim()) {
    throw new Error('Campaign ID is required');
  }

  const end = parseDate(endDate, new Date());
  const start = parseDate(startDate, new Date(end.getTime() - MAX_WINDOW_MS));

  if (start >= end || end.getTime() - start.getTime() > MAX_WINDOW_MS) {
    throw new Error('Campaign window must be positive and no longer than 7 days');
  }

  const customers = await customerModel.getEligiblePromotionalCustomers(start, end);
  const summary = {
    campaignId: campaignId.trim(),
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    matched: customers.length,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  for (const customer of customers) {
    const result = await promotionalMessageService.sendPromotionalEmails(
      { ...customer, campaignId: summary.campaignId },
      subject,
      { campaignId: summary.campaignId },
    );

    if (result?.success && result.skipped) {
      summary.skipped += 1;
    } else if (result?.success) {
      summary.sent += 1;
    } else {
      summary.failed += 1;
    }
  }

  return summary;
};

module.exports = { sendWeeklyPromotionalCampaign };
