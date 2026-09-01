const { getRequestContext } = require('../context/requestContext');

// Default system timestamp fields to ignore during mutation diffing
const DEFAULT_IGNORED_FIELDS = new Set([
  'updatedat',
  'updatedat',
  'updated_at',
  'syslastmodifieddt',
  'sysmodifieddt',
  'createdat',
  'createdat',
  'created_at',
  'sysenrollmentdt',
  'lastattemptat',
  'nextretryat',
]);

/**
 * Compare two values for functional equality handling Dates, Decimals, Objects, and Primitives
 */
const areValuesEqual = (val1, val2) => {
  if (val1 === val2) return true;

  if (val1 === null || val1 === undefined || val2 === null || val2 === undefined) {
    return val1 === val2;
  }

  // Handle Date comparison
  if (val1 instanceof Date && val2 instanceof Date) {
    return val1.getTime() === val2.getTime();
  }
  if (val1 instanceof Date || val2 instanceof Date) {
    const d1 = val1 instanceof Date ? val1 : new Date(val1);
    const d2 = val2 instanceof Date ? val2 : new Date(val2);
    if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
      return d1.getTime() === d2.getTime();
    }
  }

  // Handle Prisma Decimal.js comparison
  if (typeof val1?.equals === 'function') {
    return val1.equals(val2);
  }
  if (typeof val2?.equals === 'function') {
    return val2.equals(val1);
  }
  if (typeof val1?.toString === 'function' && typeof val2?.toString === 'function' && (val1.constructor.name === 'Decimal' || val2.constructor.name === 'Decimal')) {
    return val1.toString() === val2.toString();
  }

  // Handle Object & Array comparison
  if (typeof val1 === 'object' && typeof val2 === 'object') {
    try {
      return JSON.stringify(val1) === JSON.stringify(val2);
    } catch {
      return false;
    }
  }

  return false;
};

/**
 * Normalizes values for JSON serialization in audit logs
 */
const serializeValue = (val) => {
  if (val === null || val === undefined) return val;
  if (val instanceof Date) return val.toISOString();
  if (typeof val?.toString === 'function' && val.constructor.name === 'Decimal') {
    return val.toString();
  }
  return val;
};

/**
 * Calculate field diffs between previous state and new state
 *
 * @param {Object} oldState - Object state before mutation
 * @param {Object} newState - Object state after mutation
 * @param {Object} options - Configuration options (e.g. ignoredFields)
 * @returns {{ changedfields: string[], oldvalues: Object, newvalues: Object }}
 */
const calculateDiff = (oldState = {}, newState = {}, options = {}) => {
  const ignoredFields = options.ignoredFields
    ? new Set([...DEFAULT_IGNORED_FIELDS, ...options.ignoredFields.map((f) => f.toLowerCase())])
    : DEFAULT_IGNORED_FIELDS;

  const oldObj = oldState || {};
  const newObj = newState || {};

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const changedfields = [];
  const oldvalues = {};
  const newvalues = {};

  for (const key of allKeys) {
    if (ignoredFields.has(key.toLowerCase())) {
      continue;
    }

    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (!areValuesEqual(oldVal, newVal)) {
      changedfields.push(key);
      if (oldVal !== undefined) {
        oldvalues[key] = serializeValue(oldVal);
      }
      if (newVal !== undefined) {
        newvalues[key] = serializeValue(newVal);
      }
    }
  }

  return {
    changedfields,
    oldvalues,
    newvalues,
  };
};

/**
 * Record an audit log entry in the database
 *
 * @param {Object} prismaClient - Prisma client instance
 * @param {Object} auditData - Audit details
 * @returns {Promise<Object|null>}
 */
const recordAuditLog = async (prismaClient, auditData = {}) => {
  try {
    if (!prismaClient) return null;

    const ctx = getRequestContext();
    const {
      entityname,
      entityid,
      action = 'UPDATE',
      changedfields = [],
      oldvalues = null,
      newvalues = null,
      requestid = ctx.requestId || null,
      actor = ctx.actor || 'ANONYMOUS',
      ipaddress = ctx.ipAddress || null,
    } = auditData;

    if (!entityname || !entityid) {
      return null;
    }

    const logData = {
      entityname: String(entityname).toUpperCase(),
      entityid: String(entityid),
      action: String(action).toUpperCase(),
      changedfields: changedfields,
      oldvalues: oldvalues,
      newvalues: newvalues,
      requestid: requestid ? String(requestid) : null,
      actor: actor ? String(actor) : 'ANONYMOUS',
      ipaddress: ipaddress ? String(ipaddress) : null,
      createdat: new Date(),
    };

    if (prismaClient.auditlog?.create) {
      return await prismaClient.auditlog.create({ data: logData });
    }

    return logData;
  } catch (error) {
    console.error('[AUDIT_SERVICE] Error writing audit log:', error.message);
    return null;
  }
};

/**
 * Fetch audit logs by entity name and entity ID
 */
const getAuditLogsByEntity = async (prismaClient, entityname, entityid) => {
  try {
    if (!prismaClient?.auditlog) return [];
    return await prismaClient.auditlog.findMany({
      where: {
        entityname: String(entityname).toUpperCase(),
        entityid: String(entityid),
      },
      orderBy: { createdat: 'desc' },
    });
  } catch (error) {
    console.error('[AUDIT_SERVICE] Error fetching audit logs by entity:', error.message);
    return [];
  }
};

/**
 * Fetch audit logs by Request ID
 */
const getAuditLogsByRequestId = async (prismaClient, requestid) => {
  try {
    if (!prismaClient?.auditlog) return [];
    return await prismaClient.auditlog.findMany({
      where: {
        requestid: String(requestid),
      },
      orderBy: { createdat: 'desc' },
    });
  } catch (error) {
    console.error('[AUDIT_SERVICE] Error fetching audit logs by request ID:', error.message);
    return [];
  }
};

module.exports = {
  calculateDiff,
  recordAuditLog,
  getAuditLogsByEntity,
  getAuditLogsByRequestId,
  DEFAULT_IGNORED_FIELDS,
  areValuesEqual,
};
