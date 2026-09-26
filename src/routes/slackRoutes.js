const express = require('express');
const router = express.Router();
const SlackController = require('../controllers/slackController');
const verifySlackSignature = require('../middleware/slackAuthMiddleware');

/**
 * Route: POST /integrations/slack/render-logs
 * Description: Slack Slash Command endpoint for /render-logs
 * Security: Validates HMAC-SHA256 signature and timestamp replay window
 */
router.post('/render-logs', verifySlackSignature, SlackController.handleRenderLogs);

module.exports = router;
