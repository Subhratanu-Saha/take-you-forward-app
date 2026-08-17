const asString = (value) => {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.trim();
  return String(value).trim();
};

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : Number.NaN;
};

const validatePurchaseEvent = (event) => {
  const errors = [];

  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    return {
      valid: false,
      errors: ['Event payload must be an object'],
      normalized: null,
    };
  }

  const eventId = asString(event.eventId ?? event.eventid ?? event.id);
  const customerId = asString(
    event.customerId ?? event.customerid ?? event.customer ?? event.customer_id
  );

  const rawTotalPoints =
    event.totalpoints ??
    event.totalPoints ??
    event.totalamount ??
    event.totalAmount ??
    event.amount ??
    event.purchaseAmount ??
    event.points;

  const totalpoints = toNumber(rawTotalPoints);

  if (!eventId) {
    errors.push('eventId is required');
  }

  if (!customerId) {
    errors.push('customerId is required');
  }

  if (
    rawTotalPoints === undefined ||
    rawTotalPoints === null ||
    rawTotalPoints === ''
  ) {
    errors.push('totalpoints is required');
  } else if (Number.isNaN(totalpoints)) {
    errors.push('totalpoints must be numeric');
  } else if (totalpoints < 0) {
    errors.push('totalpoints cannot be negative');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      normalized: null,
    };
  }

  return {
    valid: true,
    errors: [],
    normalized: {
      eventId,
      customerId,
      totalpoints,
    },
  };
};

module.exports = {
  validatePurchaseEvent,
};