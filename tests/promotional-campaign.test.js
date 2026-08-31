process.env.NODE_ENV = 'test';
process.env.EMAIL_USER_ID = process.env.EMAIL_USER_ID || 'test@example.com';
process.env.EMAIL_USER_PASSCODE = process.env.EMAIL_USER_PASSCODE || 'test-app-password';

const test = require('node:test');
const assert = require('node:assert/strict');

const customerModel = require('../src/models/customer');
const customerController = require('../src/controllers/customerController');
const customerService = require('../src/services/customerService');
const welcomeEmailService = require('../src/services/welcomeEmailService');
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

test('customer creation triggers welcome flow without promotional trigger', async () => {
  const originalCreateCustomer = customerService.createCustomer;
  const originalWelcomeEmail = welcomeEmailService.sendWelcomeEmail;
  const originalFetch = global.fetch;
  const calls = [];

  try {
    customerService.createCustomer = async () => ({
      customerid: 'CUST-NEW-1',
      emailadd: 'newcustomer@example.com',
      firstname: 'New',
      lastname: 'Customer',
      city: 'Bengaluru',
    });

    welcomeEmailService.sendWelcomeEmail = async (customer) => {
      calls.push({ type: 'welcome', customer });
      return { success: true, skipped: false };
    };

    global.fetch = async (url, options) => {
      const body = options?.body ? JSON.parse(options.body) : {};
      calls.push({ type: 'fetch', url, body });
      return { ok: true, status: 200 };
    };

    const req = {
      requestId: 'REQ-CUSTOMER-ONBOARDING',
      body: {
        firstname: 'New',
        lastname: 'Customer',
        emailadd: 'newcustomer@example.com',
        city: 'Bengaluru',
      },
    };
    const res = {
      statusCode: null,
      payload: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };

    await customerController.createCustomer(req, res, () => {});

    assert.equal(
      calls.some((entry) => entry.type === 'fetch' && String(entry.url).includes('/api/v1/promotionalmessage')),
      false,
      'Customer creation should not trigger the promotional email endpoint'
    );
    assert.equal(
      calls.some((entry) => entry.type === 'welcome'),
      true,
      'Customer creation should trigger the welcome email flow'
    );
  } finally {
    customerService.createCustomer = originalCreateCustomer;
    welcomeEmailService.sendWelcomeEmail = originalWelcomeEmail;
    global.fetch = originalFetch;
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
