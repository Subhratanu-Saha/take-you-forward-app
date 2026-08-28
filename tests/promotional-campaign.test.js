process.env.NODE_ENV = 'test';
process.env.EMAIL_USER_ID = process.env.EMAIL_USER_ID || 'test@example.com';
process.env.EMAIL_USER_PASSCODE = process.env.EMAIL_USER_PASSCODE || 'test-app-password';

const test = require('node:test');
const assert = require('node:assert/strict');

const customerModel = require('../src/models/customer');
const promotionalMessageService = require('../src/services/promotionalMessageService');
const { sendWeeklyPromotionalCampaign } = require('../src/services/promotionalCampaignService');

const eligibleCustomer = {
  customerid: 'CUST-123',
  emailadd: 'customer@example.com',
  firstname: 'Test',
  sysenrollmentdt: new Date(),
};

test('weekly campaign sends only the customers returned by the eligible audience query', async () => {
  const originalFind = customerModel.getEligiblePromotionalCustomers;
  const originalSend = promotionalMessageService.sendPromotionalEmails;
  const sent = [];

  try {
    customerModel.getEligiblePromotionalCustomers = async () => [eligibleCustomer];
    promotionalMessageService.sendPromotionalEmails = async (customer, subject, options) => {
      sent.push({ customer, subject, options });
      return { success: true, skipped: false };
    };

    const summary = await sendWeeklyPromotionalCampaign({ campaignId: 'PROMO-WEEK-1' });

    assert.equal(summary.matched, 1);
    assert.equal(summary.sent, 1);
    assert.equal(summary.skipped, 0);
    assert.equal(summary.failed, 0);
    assert.equal(sent[0].options.campaignId, 'PROMO-WEEK-1');
  } finally {
    customerModel.getEligiblePromotionalCustomers = originalFind;
    promotionalMessageService.sendPromotionalEmails = originalSend;
  }
});

test('weekly campaign counts opted-out or previously sent customers as skipped', async () => {
  const originalFind = customerModel.getEligiblePromotionalCustomers;
  const originalSend = promotionalMessageService.sendPromotionalEmails;

  try {
    customerModel.getEligiblePromotionalCustomers = async () => [eligibleCustomer];
    promotionalMessageService.sendPromotionalEmails = async () => ({
      success: true,
      skipped: true,
      message: 'Email skipped due to consent or deduplication',
    });

    const summary = await sendWeeklyPromotionalCampaign({
      campaignId: 'PROMO-WEEK-2',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    });

    assert.equal(summary.matched, 1);
    assert.equal(summary.sent, 0);
    assert.equal(summary.skipped, 1);
    assert.equal(summary.failed, 0);
  } finally {
    customerModel.getEligiblePromotionalCustomers = originalFind;
    promotionalMessageService.sendPromotionalEmails = originalSend;
  }
});

test('weekly campaign counts failed dispatches for DLQ processing', async () => {
  const originalFind = customerModel.getEligiblePromotionalCustomers;
  const originalSend = promotionalMessageService.sendPromotionalEmails;

  try {
    customerModel.getEligiblePromotionalCustomers = async () => [eligibleCustomer];
    promotionalMessageService.sendPromotionalEmails = async () => ({
      success: false,
      message: 'SMTP unavailable',
    });

    const summary = await sendWeeklyPromotionalCampaign({ campaignId: 'PROMO-WEEK-3' });

    assert.equal(summary.matched, 1);
    assert.equal(summary.sent, 0);
    assert.equal(summary.skipped, 0);
    assert.equal(summary.failed, 1);
  } finally {
    customerModel.getEligiblePromotionalCustomers = originalFind;
    promotionalMessageService.sendPromotionalEmails = originalSend;
  }
});

test('weekly campaign rejects windows longer than seven days', async () => {
  await assert.rejects(
    sendWeeklyPromotionalCampaign({
      campaignId: 'PROMO-INVALID',
      startDate: '2026-08-01T00:00:00.000Z',
      endDate: '2026-08-10T00:00:00.000Z',
    }),
    /no longer than 7 days/
  );
});
