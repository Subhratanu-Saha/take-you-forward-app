const express = require('express');
const auditController = require('../controllers/auditController');

const router = express.Router();

router.get('/', auditController.getAuditLogs);
router.get('/timeline/:entityName/:entityId', auditController.getAuditTimeline);
router.get('/stats', auditController.getAuditStats);
router.get('/export', auditController.exportAuditLogs);
router.get('/:auditId', auditController.getAuditLog);

module.exports = router;