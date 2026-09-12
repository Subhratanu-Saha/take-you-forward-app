const express = require('express');
const auditController = require('../controllers/auditController');

{
const router = express.Router();

router.get('/', auditController.getAuditLogs);
router.get('/timeline/:entityName/:entityId', auditController.getAuditTimeline);
router.get('/stats', auditController.getAuditStats);
router.get('/export', auditController.exportAuditLogs);
router.get('/:auditId', auditController.getAuditLog);
}
const controller = require('../controllers/auditController');

const router = express.Router();

router.get('/stats', controller.auditStats);
router.get('/request/:requestId', controller.getAuditLogsByRequestId);
router.get('/:id', controller.getAuditLogById);
router.get('/', controller.listAuditLogs);
router.get('/export', controller.exportAuditLogs);

module.exports = router;