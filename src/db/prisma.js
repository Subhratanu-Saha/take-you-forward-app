const { PrismaClient } = require('@prisma/client');
const { calculateDiff, recordAuditLog } = require('../services/auditService');

// Map of tracked entity models and their configuration
const TRACKED_ENTITIES = {
  customer: { entitytype: 'CUSTOMER', entityname: 'CUSTOMER', idField: 'customerid' },
  orderheader: { entitytype: 'ORDER', entityname: 'ORDER', idField: 'orderid' },
  order: { entitytype: 'ORDER', entityname: 'ORDER', idField: 'orderid' },
  loyalty: { entitytype: 'LOYALTY', entityname: 'LOYALTY', idField: 'loyaltyid' },
};

/**
 * Creates and attaches the audit logging change-capture extension to a PrismaClient instance
 *
 * @param {PrismaClient} baseClient
 * @returns {PrismaClient}
 */
const attachAuditExtension = (baseClient) => {
  return baseClient.$extends({
    name: 'auditLogChangeCapture',
    query: {
      $allModels: {
        async update({ model, operation, args, query }) {
          const modelLower = (model || '').toLowerCase();
          const entityConfig = TRACKED_ENTITIES[modelLower];

          if (!entityConfig) {
            return query(args);
          }

          // 1. Fetch the pre-mutation snapshot
          let oldState = null;
          try {
            if (baseClient[modelLower]?.findUnique && args?.where) {
              oldState = await baseClient[modelLower].findUnique({ where: args.where });
            } else if (baseClient[modelLower]?.findFirst && args?.where) {
              oldState = await baseClient[modelLower].findFirst({ where: args.where });
            }
          } catch (fetchErr) {
            // Non-blocking snapshot failure
          }

          // 2. Execute the actual mutation
          const result = await query(args);

          // 3. Compute diffs and record audit log asynchronously
          try {
            const { changedfields, oldvalues, newvalues } = calculateDiff(oldState, result);

            if (changedfields && changedfields.length > 0) {
              const entityId =
                result?.[entityConfig.idField] ||
                oldState?.[entityConfig.idField] ||
                args.where?.[entityConfig.idField] ||
                result?.id ||
                args.where?.id ||
                'UNKNOWN';

              const customerId =
                result?.customerid ||
                oldState?.customerid ||
                args.data?.customerid ||
                args.where?.customerid ||
                (modelLower === 'customer' ? entityId : null);

              await recordAuditLog(baseClient, {
                entitytype: entityConfig.entitytype,
                entityid: String(entityId),
                action: 'UPDATE',
                customerid: customerId,
                oldervalue: oldvalues,
                newvalue: newvalues,
                changedfields,
              });
            }
          } catch (auditErr) {
            console.error(`[AUDIT_EXTENSION] Error recording update audit log for ${model}:`, auditErr.message);
          }

          return result;
        },

        async create({ model, operation, args, query }) {
          const modelLower = (model || '').toLowerCase();
          const entityConfig = TRACKED_ENTITIES[modelLower];

          const result = await query(args);

          if (entityConfig) {
            try {
              const entityId = result?.[entityConfig.idField] || result?.id || 'UNKNOWN';
              const { changedfields, newvalues } = calculateDiff({}, result);

              const customerId =
                result?.customerid ||
                args.data?.customerid ||
                (modelLower === 'customer' ? entityId : null);

              await recordAuditLog(baseClient, {
                entitytype: entityConfig.entitytype,
                entityid: String(entityId),
                action: 'CREATE',
                customerid: customerId,
                oldervalue: null,
                newvalue: newvalues,
                changedfields,
              });
            } catch (auditErr) {
              console.error(`[AUDIT_EXTENSION] Error recording create audit log for ${model}:`, auditErr.message);
            }
          }

          return result;
        },

        async delete({ model, operation, args, query }) {
          const modelLower = (model || '').toLowerCase();
          const entityConfig = TRACKED_ENTITIES[modelLower];

          if (!entityConfig) {
            return query(args);
          }

          let oldState = null;
          try {
            if (baseClient[modelLower]?.findUnique && args?.where) {
              oldState = await baseClient[modelLower].findUnique({ where: args.where });
            } else if (baseClient[modelLower]?.findFirst && args?.where) {
              oldState = await baseClient[modelLower].findFirst({ where: args.where });
            }
          } catch (fetchErr) {
            // Non-blocking snapshot failure
          }

          const result = await query(args);

          try {
            const entityId =
              result?.[entityConfig.idField] ||
              oldState?.[entityConfig.idField] ||
              args.where?.[entityConfig.idField] ||
              result?.id ||
              'UNKNOWN';

            const customerId =
              result?.customerid ||
              oldState?.customerid ||
              (modelLower === 'customer' ? entityId : null);

            const { changedfields, oldvalues } = calculateDiff(oldState || result, {});

            await recordAuditLog(baseClient, {
              entitytype: entityConfig.entitytype,
              entityid: String(entityId),
              action: 'DELETE',
              customerid: customerId,
              oldervalue: oldvalues,
              newvalue: null,
              changedfields,
            });
          } catch (auditErr) {
            console.error(`[AUDIT_EXTENSION] Error recording delete audit log for ${model}:`, auditErr.message);
          }

          return result;
        },
      },
    },
  });
};

// Base raw PrismaClient
const rawPrisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Extended PrismaClient with change-capture enabled
const prisma = attachAuditExtension(rawPrisma);

module.exports = prisma;
module.exports.prisma = prisma;
module.exports.rawPrisma = rawPrisma;
module.exports.attachAuditExtension = attachAuditExtension;
module.exports.TRACKED_ENTITIES = TRACKED_ENTITIES;
