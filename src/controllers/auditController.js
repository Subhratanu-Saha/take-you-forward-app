const prisma = require('../utils/db');
const auditService = require('../services/auditService');

const ACTIONS = new Set(['CREATE', 'UPDATE', 'DELETE']);

const parseDate = (value, name, endOfDay = false) => {
  if (value === undefined) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(String(value))) {
    const error = new Error(`${name} must be a valid ISO 8601 date`);
    error.statusCode = 400;
    throw error;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${name} must be a valid ISO 8601 date`);
    error.statusCode = 400;
    throw error;
  }
  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    date.setUTCHours(23, 59, 59, 999);
  }
  return date;
};

const parseFilters = (query = {}) => {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 10 : Number(query.limit);

  if (!Number.isInteger(page) || page < 1) {
    const error = new Error('page must be a positive integer');
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    const error = new Error('limit must be an integer between 1 and 100');
    error.statusCode = 400;
    throw error;
  }

  const action = query.action?.toUpperCase();
  if (action && !ACTIONS.has(action)) {
    const error = new Error('action must be one of CREATE, UPDATE, or DELETE');
    error.statusCode = 400;
    throw error;
  }

  return {
    entityname: query.entityname || query.entityName,
    entityid: query.entityid || query.entityId,
    action,
    actor: query.performedby || query.actor,
    search: query.search || query.q,
    startDate: parseDate(query.startDate || query.startdate || query.dateFrom || query.fromDate || query.from, 'startDate'),
    endDate: parseDate(query.endDate || query.enddate || query.dateTo || query.toDate || query.to, 'endDate', true),
    page,
    limit,
  };
};

const sendError = (res, error) => res.status(error.statusCode || 500).json({
  success: false,
  message: error.message || 'Internal server error',
});

const getAuditLogs = async (req, res) => {
  try {
    const filters = parseFilters(req.query);
    const { logs, totalRecords } = await auditService.findAuditLogs(prisma, filters);
    res.status(200).json({
      success: true,
      pagination: {
        totalRecords,
        currentPage: filters.page,
        totalPages: Math.ceil(totalRecords / filters.limit),
        limit: filters.limit,
      },
      data: logs,
    });
  } catch (error) {
    sendError(res, error);
  }
};

const getAuditLog = async (req, res) => {
  try {
    const auditLog = await auditService.getAuditLogById(prisma, req.params.auditId);
    if (!auditLog) return res.status(404).json({ success: false, message: 'Audit log not found' });
    return res.status(200).json({ success: true, data: auditLog });
  } catch (error) {
    return sendError(res, error);
  }
};

const getAuditTimeline = async (req, res) => {
  try {
    const { entityName, entityId } = req.params;
    const logs = await auditService.getAuditTimeline(prisma, entityName, entityId);
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    sendError(res, error);
  }
};

const getAuditStats = async (req, res) => {
  try {
    const filters = parseFilters({ ...req.query, page: 1, limit: 1 });
    const stats = await auditService.getAuditStats(prisma, filters);
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    sendError(res, error);
  }
};

const csvValue = (value) => {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const exportAuditLogs = async (req, res) => {
  try {
    const filters = parseFilters({ ...req.query, page: 1, limit: 100 });
    const exportFilters = { ...filters, page: 1, limit: 1000000 };
    const { logs } = await auditService.findAuditLogs(prisma, exportFilters);
    const headers = ['auditid', 'entityname', 'entityid', 'action', 'performedby', 'changedfields', 'createdat'];
    const rows = logs.map((log) => headers.map((header) => csvValue(log[header])).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.status(200).send(csv);
  } catch (error) {
    sendError(res, error);
  }
};

module.exports = {
  getAuditLogs,
  getAuditLog,
  getAuditTimeline,
  getAuditStats,
  exportAuditLogs,
  parseFilters,
};