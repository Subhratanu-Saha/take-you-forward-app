const prisma = require('../db/prisma');
const {
  getAuditLogs,
  getAuditStats,
} = require('../services/auditService');

const listAuditLogs = async (req, res, next) => {
  try {
    const result = await getAuditLogs(
      prisma,
      req.query.page,
      req.query.pageSize
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const auditStats = async (req, res, next) => {
  try {
    const stats = await getAuditStats(prisma);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listAuditLogs,
  auditStats,
};