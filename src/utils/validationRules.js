/**
 * Shared Validation Rules & Formatting Helpers
 * Consolidates regex patterns, ID formats, type converters, and pagination rules across the application.
 */

// ==================== SHARED REGEX PATTERNS ====================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const PINCODE_REGEX = /^\d{6}$/;
const CUSTOMER_ID_REGEX = /^CUST-\d+-[A-Z0-9]{10}$/;
const ORDER_ID_REGEX = /^ORD-\d+-[A-Z0-9]{6}$/;
const ORDER_ID_PREFIX_REGEX = /^ORD-\d+-[A-Z0-9]+$/;
const SUBSCRIBER_ID_REGEX = /^SUB-\d+-[A-Z0-9]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

// ==================== VALIDATOR HELPERS ====================

const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
};

const isValidPhone = (phone) => {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  return PHONE_REGEX.test(digits);
};

const isValidPincode = (pincode) => {
  if (!pincode) return false;
  return PINCODE_REGEX.test(String(pincode).trim());
};

const isValidCustomerId = (customerId) => {
  if (!customerId || typeof customerId !== 'string') return false;
  return CUSTOMER_ID_REGEX.test(customerId.trim());
};

const isValidOrderId = (orderId, exact = true) => {
  if (!orderId || typeof orderId !== 'string') return false;
  const pattern = exact ? ORDER_ID_REGEX : ORDER_ID_PREFIX_REGEX;
  return pattern.test(orderId.trim());
};

const isValidSubscriberId = (subscriberId) => {
  if (!subscriberId || typeof subscriberId !== 'string') return false;
  return SUBSCRIBER_ID_REGEX.test(subscriberId.trim());
};

const isValidUUID = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false;
  return UUID_REGEX.test(uuid.trim());
};

const isNonEmptyString = (value) => {
  return typeof value === 'string' && value.trim().length > 0;
};

const isBoolean = (value) => {
  return typeof value === 'boolean';
};

// ==================== NORMALIZATION & PARSERS ====================

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const normalizeBoolean = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
};

const parsePositiveInteger = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
};

const parsePagination = ({ page, limit }, defaultPage = 1, defaultLimit = 20, maxLimit = 100) => {
  const errors = [];
  let pageValue = defaultPage;
  let limitValue = defaultLimit;

  if (page !== undefined) {
    const parsedPage = Number(page);
    if (!Number.isInteger(parsedPage) || parsedPage <= 0) {
      errors.push('page must be a positive integer');
    } else {
      pageValue = parsedPage;
    }
  }

  if (limit !== undefined) {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      errors.push('limit must be a positive integer');
    } else if (maxLimit && parsedLimit > maxLimit) {
      errors.push(`limit must be an integer between 1 and ${maxLimit}`);
    } else {
      limitValue = parsedLimit;
    }
  }

  return { page: pageValue, limit: limitValue, errors };
};

module.exports = {
  EMAIL_REGEX,
  PHONE_REGEX,
  PINCODE_REGEX,
  CUSTOMER_ID_REGEX,
  ORDER_ID_REGEX,
  ORDER_ID_PREFIX_REGEX,
  SUBSCRIBER_ID_REGEX,
  UUID_REGEX,
  ISO_DATE_REGEX,
  isValidEmail,
  isValidPhone,
  isValidPincode,
  isValidCustomerId,
  isValidOrderId,
  isValidSubscriberId,
  isValidUUID,
  isNonEmptyString,
  isBoolean,
  normalizeNumber,
  normalizeBoolean,
  parsePositiveInteger,
  parsePagination,
};
