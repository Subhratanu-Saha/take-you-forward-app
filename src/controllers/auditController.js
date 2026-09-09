const prisma = require('../db/prisma');
const {
  getAuditLogs,
  getAuditStats,
  getAuditLogsByRequestId,
  getAuditLogById: fetchAuditLogById,
} = require('../services/auditService');

const listAuditLogs = async (req, res, next) => {
  try {
    const { page, pageSize, requestId, entityType } = req.query;
    const result = await getAuditLogs(
      prisma,
      page,
      pageSize,
      { requestId, entityType }
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

const getLogsByRequestId = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    if (!requestId) {
      return res.status(400).json({
        success: false,
        message: 'Request ID parameter is required',
      });
    }

    const logs = await getAuditLogsByRequestId(prisma, requestId);

    res.json({
      success: true,
      requestId,
      count: logs.length,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};

const getAuditLogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const log = await fetchAuditLogById(prisma, id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found',
      });
    }

    res.json({
      success: true,
      data: log,
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
  getLogsByRequestId,
  getAuditLogById,
};