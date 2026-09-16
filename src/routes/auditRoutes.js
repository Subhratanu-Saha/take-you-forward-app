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
const auditController = require('../controllers/auditController');

const router = express.Router();

// Static routes must come before dynamic /:id routes to avoid route precedence collision
router.get('/stats', auditController.getAuditStats);
router.get('/export', auditController.exportAuditLogs);
router.get('/timeline/:entityName/:entityId', auditController.getAuditTimeline);
router.get('/request/:requestId', auditController.getAuditLogsByRequestId);
router.get('/', auditController.getAuditLogs);
router.get('/:auditId', auditController.getAuditLog);

module.exports = router;
