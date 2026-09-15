const express = require('express');
const controller = require('../controllers/auditController');

const router = express.Router();

// 1. Root collection route
router.get('/', controller.getAuditLogs);

router.get('/stats', controller.getAuditStats);
router.get('/timeline/:entityName/:entityId', controller.getAuditTimeline);
router.get('/request/:requestId', controller.getAuditLogsByRequestId);
router.get('/export', controller.exportAuditLogs); 
router.get('/:auditId', controller.getAuditLog);

module.exports = router;
