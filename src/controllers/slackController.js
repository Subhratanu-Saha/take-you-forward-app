const config = require('../config');
const RenderLogsService = require('../services/renderLogsService');
const { formatLogsForSlack, formatErrorForSlack } = require('../utils/slackFormatter');
const { logger } = require('../utils/db');

/**
 * Controller handling Slack integration commands.
 */
class SlackController {
  /**
   * Handles the /render-logs slash command from Slack.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  static async handleRenderLogs(req, res) {
    const {
      channel_id,
      team_id,
      user_id,
      user_name,
      text = '',
      response_url,
    } = req.body || {};

    const requestId = req.requestId || 'SLACK-REQ';

    logger.info('SLACK_CONTROLLER', 'Slash command /render-logs received', {
      requestId,
      userId: user_id,
      userName: user_name,
      channelId: channel_id,
      teamId: team_id,
    });

    // 1. Team ID authorization check (OPTIONAL: only enforced if SLACK_ALLOWED_TEAM_ID is configured)
    const allowedTeamId = config.slack?.allowedTeamId?.trim?.() || config.slack?.allowedTeamId;
    if (allowedTeamId && team_id && team_id !== allowedTeamId) {
      logger.warn('SLACK_CONTROLLER', 'Command rejected: unauthorized Slack team/workspace', {
        requestId,
        teamId: team_id,
        allowedTeamId,
      });
      return res.status(200).json(
        formatErrorForSlack('Access Denied', 'This command cannot be used from this Slack workspace.')
      );
    }

    // 2. Channel ID authorization check (if configured)
    const allowedChannelId = config.slack?.allowedChannelId?.trim?.() || config.slack?.allowedChannelId;
    if (allowedChannelId && channel_id && channel_id !== allowedChannelId) {
      logger.warn('SLACK_CONTROLLER', 'Command rejected: unauthorized channel', {
        requestId,
        channelId: channel_id,
        allowedChannelId,
      });
      return res.status(200).json(
        formatErrorForSlack('Access Denied', 'The `/render-logs` command is only permitted in the designated dev channel.')
      );
    }

    // 3. User ID authorization check (OPTIONAL: only enforced if SLACK_ALLOWED_USER_IDS is configured)
    const allowedUserIds = Array.isArray(config.slack?.allowedUserIds) && config.slack.allowedUserIds.length > 0
      ? config.slack.allowedUserIds
      : null;

    if (allowedUserIds && user_id && !allowedUserIds.includes(user_id)) {
      logger.warn('SLACK_CONTROLLER', 'Command rejected: unauthorized user', {
        requestId,
        userId: user_id,
      });
      return res.status(200).json(
        formatErrorForSlack('Access Denied', 'Your Slack user account is not authorized to access server logs.')
      );
    }

    // 4. Parse arguments and enforce service ID protection
    const trimmedText = String(text || '').trim();

    // Prevent arbitrary service ID injection
    if (/^srv-[a-z0-9]+/i.test(trimmedText)) {
      return res.status(200).json(
        formatErrorForSlack(
          'Invalid Argument',
          'Specifying custom Render Service IDs is not allowed. Logs are only fetched for the configured backend service.'
        )
      );
    }

    let limit = 30;
    let filter = null;

    if (trimmedText) {
      const parts = trimmedText.split(/\s+/);
      const firstTokenNum = parseInt(parts[0], 10);

      if (!Number.isNaN(firstTokenNum)) {
        limit = Math.min(Math.max(firstTokenNum, 5), 50); // bounded 5 to 50
        if (parts.length > 1) {
          filter = parts.slice(1).join(' ');
        }
      } else {
        filter = trimmedText;
      }
    }

    // 5. Strategy: Immediate Ack + Asynchronous delivery via response_url
    // Slack requires an HTTP 200 response within 3,000ms.
    if (response_url) {
      // Immediate ephemeral acknowledgment
      res.status(200).json({
        response_type: 'ephemeral',
        text: `⏳ Fetching the latest ${limit} log lines from Render${filter ? ` matching "*${filter}*"` : ''}...`,
      });

      // Background asynchronous fetch and dispatch
      setImmediate(async () => {
        try {
          const result = await RenderLogsService.fetchLogs({ limit, filter });

          let payload;
          if (result.success) {
            payload = formatLogsForSlack({
              serviceId: result.serviceId,
              logs: result.logs,
              filter,
            });
          } else {
            payload = formatErrorForSlack('Render Logs Error', result.message || 'Unable to retrieve logs.');
          }

          const dispatchResponse = await fetch(response_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (!dispatchResponse.ok) {
            throw new Error(`Slack response_url returned HTTP ${dispatchResponse.status}`);
          }

          logger.info('SLACK_CONTROLLER', 'Render logs successfully dispatched to response_url', {
            requestId,
            userId: user_id,
          });
        } catch (dispatchErr) {
          logger.error('SLACK_CONTROLLER', `Failed to send logs to response_url: ${dispatchErr.message}`, {
            requestId,
            error: dispatchErr.message,
          });
        }
      });

      return;
    }

    // Fallback synchronous response (e.g. testing environments without response_url)
    try {
      const result = await RenderLogsService.fetchLogs({ limit, filter });
      if (result.success) {
        return res.status(200).json(
          formatLogsForSlack({
            serviceId: result.serviceId,
            logs: result.logs,
            filter,
          })
        );
      }
      return res.status(200).json(
        formatErrorForSlack('Render Logs Error', result.message || 'Unable to retrieve logs.')
      );
    } catch (err) {
      logger.error('SLACK_CONTROLLER', `Error in synchronous handler: ${err.message}`, { error: err.message });
      return res.status(200).json(
        formatErrorForSlack('Internal Error', 'An unexpected error occurred while fetching logs.')
      );
    }
  }
}

module.exports = SlackController;
