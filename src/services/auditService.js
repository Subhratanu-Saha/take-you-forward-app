const prisma = require('../utils/db');

/**
 * Log audit entry for business compliance
 * @param {Object} params - Audit parameters
 * @param {String} params.entityType - "LOYALTY", "SUBSCRIBER", "DLQ"
 * @param {String} params.entityId - Unique entity identifier (loyaltyid, subscriberid, eventid)
 * @param {String} params.action - Action type (e.g., "TIER_UPGRADED", "CONSENT_CHANGED")
 * @param {String} params.customerId - Associated customer ID for audit trail
 * @param {Object} params.oldValue - Previous state
 * @param {Object} params.newValue - New state
 * @param {Object} params.metadata - Additional context (orderId, campaignId, etc.)
 * @param {String} params.createdBy - User/system identifier (default: "SYSTEM")
 * @param {String} params.createdByType - "AUTOMATED" or "MANUAL_OVERRIDE"
 */
const createAuditEntry = async ({
  entityType,
  entityId,
  action,
  customerId,
  oldValue,
  newValue,
  metadata = {},
  createdBy = "SYSTEM",
  createdByType = "AUTOMATED",
}) => {
  try {
    if (!entityType || !entityId || !action) {
      throw new Error("entityType, entityId, and action are required");
    }

    const auditEntry = await prisma.auditlog.create({
      data: {
        entitytype: entityType,
        entityid: entityId.toString(),
        action,
        customerid: customerId,
        oldervalue: oldValue || null,
        newvalue: newValue || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        createdby: createdBy,
        createdby_type: createdByType,
        createdat: new Date(),
      },
    });

    console.info("[AUDIT_SERVICE] Audit entry created", {
      auditlogid: auditEntry.auditlogid,
      entitytype: auditEntry.entitytype,
      action: auditEntry.action,
      customerId: auditEntry.customerid,
    });

    return auditEntry;
  } catch (error) {
    console.error("[AUDIT_SERVICE] Failed to create audit entry", {
      entityType,
      entityId,
      action,
      error: error.message,
    });
    // Don't throw - audit failure should not break business logic
    return null;
  }
};

/**
 * Get audit trail for a specific entity
 */
const getAuditTrailByEntityId = async (entityId) => {
  try {
    return await prisma.auditlog.findMany({
      where: { entityid: entityId.toString() },
      orderBy: { createdat: "desc" },
    });
  } catch (error) {
    console.error("[AUDIT_SERVICE] Failed to fetch audit trail", error);
    throw error;
  }
};

/**
 * Get compliance audit trail for a customer (all entity types)
 */
const getCustomerAuditTrail = async (customerId, options = {}) => {
  const { from, to, entityType } = options;
  try {
    const whereClause = { customerid: customerId };
    
    if (entityType) {
      whereClause.entitytype = entityType;
    }
    
    if (from || to) {
      whereClause.createdat = {};
      if (from) whereClause.createdat.gte = new Date(from);
      if (to) whereClause.createdat.lte = new Date(to);
    }

    return await prisma.auditlog.findMany({
      where: whereClause,
      orderBy: { createdat: "desc" },
    });
  } catch (error) {
    console.error("[AUDIT_SERVICE] Failed to fetch customer audit trail", error);
    throw error;
  }
};

module.exports = {
  createAuditEntry,
  getAuditTrailByEntityId,
  getCustomerAuditTrail,
};