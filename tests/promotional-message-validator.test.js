const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateCreatePromotionalMessage,
} = require('../src/middleware/promotionalMessageValidator');

const createMockReqRes = (body = {}) => {
  const req = {
    body,
  };

  const res = {
    statusCode: null,
    responseBody: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.responseBody = payload;
      return this;
    },
  };

  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, wasNextCalled: () => nextCalled };
};

const validBasePayload = {
  customerid: 'CUST-1750000000000-ABC1234567',
  title: 'Special 1-Week Offer',
  message: 'Enjoy special savings this week only!',
};

test('accepts expirationDate within 7 days in the future', () => {
  const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
  const { req, res, next, wasNextCalled } = createMockReqRes({
    ...validBasePayload,
    expirationDate: futureDate,
  });

  validateCreatePromotionalMessage(req, res, next);

  assert.equal(wasNextCalled(), true);
  assert.equal(res.statusCode, null);
  assert.equal(req.body.expirationDate, new Date(futureDate).toISOString());
});

test('accepts expirationDate exactly 7 days in the future', () => {
  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 - 1000).toISOString();
  const { req, res, next, wasNextCalled } = createMockReqRes({
    ...validBasePayload,
    expirationDate: futureDate,
  });

  validateCreatePromotionalMessage(req, res, next);

  assert.equal(wasNextCalled(), true);
  assert.equal(res.statusCode, null);
});

test('rejects expirationDate more than 7 days in the future', () => {
  const futureDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString();
  const { req, res, next, wasNextCalled } = createMockReqRes({
    ...validBasePayload,
    expirationDate: futureDate,
  });

  validateCreatePromotionalMessage(req, res, next);

  assert.equal(wasNextCalled(), false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.responseBody.success, false);
  assert.equal(res.responseBody.message, 'Validation failed');
  assert.ok(
    res.responseBody.errors.some((err) =>
      err.includes('Expiration date cannot be more than 7 days in the future')
    ),
    'Expected error message about exceeding 7 days in the future'
  );
});

test('rejects expirationDate 30 days in the future', () => {
  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { req, res, next, wasNextCalled } = createMockReqRes({
    ...validBasePayload,
    expirationDate: futureDate,
  });

  validateCreatePromotionalMessage(req, res, next);

  assert.equal(wasNextCalled(), false);
  assert.equal(res.statusCode, 400);
  assert.ok(
    res.responseBody.errors.some((err) =>
      err.includes('7 days')
    )
  );
});

test('rejects expirationDate in the past', () => {
  const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { req, res, next, wasNextCalled } = createMockReqRes({
    ...validBasePayload,
    expirationDate: pastDate,
  });

  validateCreatePromotionalMessage(req, res, next);

  assert.equal(wasNextCalled(), false);
  assert.equal(res.statusCode, 400);
  assert.ok(
    res.responseBody.errors.includes('Expiration date must be in the future')
  );
});

test('rejects invalid expirationDate format', () => {
  const { req, res, next, wasNextCalled } = createMockReqRes({
    ...validBasePayload,
    expirationDate: 'not-a-valid-date',
  });

  validateCreatePromotionalMessage(req, res, next);

  assert.equal(wasNextCalled(), false);
  assert.equal(res.statusCode, 400);
  assert.ok(
    res.responseBody.errors.includes('Expiration date must be a valid date')
  );
});

test('rejects non-string expirationDate', () => {
  const { req, res, next, wasNextCalled } = createMockReqRes({
    ...validBasePayload,
    expirationDate: 1750000000000,
  });

  validateCreatePromotionalMessage(req, res, next);

  assert.equal(wasNextCalled(), false);
  assert.equal(res.statusCode, 400);
  assert.ok(
    res.responseBody.errors.includes('Expiration date must be a valid date')
  );
});

test('allows request without expirationDate', () => {
  const { req, res, next, wasNextCalled } = createMockReqRes({
    ...validBasePayload,
  });

  validateCreatePromotionalMessage(req, res, next);

  assert.equal(wasNextCalled(), true);
  assert.equal(res.statusCode, null);
  assert.equal(req.body.expirationDate, undefined);
});
