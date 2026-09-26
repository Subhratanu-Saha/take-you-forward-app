const crypto = require('crypto');
const config = require('../config');
const { logger } = require('../utils/db');

/**
 * Middleware to verify that incoming requests are authentically signed by Slack.
 *
 * Enforces:
 * 1. Presence of X-Slack-Signature and X-Slack-Request-Timestamp headers.
 * 2. 5-minute replay attack protection window (300 seconds).
 * 3. Constant-time HMAC-SHA256 signature verification.
 */
const verifySlackSignature = (req, res, next) => {
  const timestamp = req.headers['x-slack-request-timestamp'];
  const slackSignature = req.headers['x-slack-signature'];

  if (!timestamp || !slackSignature) {
    logger.warn('SLACK_AUTH', 'Slack signature verification rejected: missing headers', {
      requestId: req.requestId,
      path: req.originalUrl || req.path,
      statusCode: 401,
    });
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing Slack verification headers',
    });
  }

  // 1. Replay attack verification (5 minutes / 300 seconds window)
  const currentTime = Math.floor(Date.now() / 1000);
  const parsedTimestamp = parseInt(timestamp, 10);

  if (Number.isNaN(parsedTimestamp) || Math.abs(currentTime - parsedTimestamp) > 300) {
    logger.warn('SLACK_AUTH', 'Slack signature verification rejected: request timestamp out of bounds', {
      requestId: req.requestId,
      currentTime,
      timestamp: parsedTimestamp,
      statusCode: 400,
    });
    return res.status(400).json({
      success: false,
      message: 'Bad Request: Slack request timestamp expired or invalid',
    });
  }

  // 2. Retrieve Slack Signing Secret
  const signingSecret = config.slack?.signingSecret || process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    logger.error('SLACK_AUTH', 'Slack signing secret not configured in environment', {
      requestId: req.requestId,
    });
    return res.status(500).json({
      success: false,
      message: 'Server Error: Slack integration is not configured',
    });
  }

  // 3. Extract raw request payload string
  let rawBodyString = '';
  if (req.rawBody) {
    rawBodyString = Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : String(req.rawBody);
  } else if (typeof req.body === 'string') {
    rawBodyString = req.body;
  } else if (req.body && Object.keys(req.body).length > 0) {
    // Fallback if rawBody was not captured: re-encode urlencoded form
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.body)) {
      params.append(key, value);
    }
    rawBodyString = params.toString();
  }

  // 4. Compute HMAC-SHA256 signature
  const sigBasestring = `v0:${timestamp}:${rawBodyString}`;
  const computedSignature = `v0=${crypto.createHmac('sha256', signingSecret).update(sigBasestring, 'utf8').digest('hex')}`;

  // 5. Compare signatures using constant-time equality
  const computedBuffer = Buffer.from(computedSignature, 'utf8');
  const slackBuffer = Buffer.from(slackSignature, 'utf8');

  if (computedBuffer.length !== slackBuffer.length || !crypto.timingSafeEqual(computedBuffer, slackBuffer)) {
    logger.warn('SLACK_AUTH', 'Slack signature verification failed: signature mismatch', {
      requestId: req.requestId,
      path: req.originalUrl || req.path,
      statusCode: 401,
    });
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid Slack signature',
    });
  }

  next();
};

module.exports = verifySlackSignature;
