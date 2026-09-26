const config = require('../config');
const { logger } = require('../utils/db');

/**
 * Service to interact with the Render REST API and fetch logs.
 */
class RenderLogsService {
  /**
   * Fetches recent logs for the configured Render service.
   *
   * @param {Object} options
   * @param {number} [options.limit=30] - Number of log lines to retrieve (max 100)
   * @param {string} [options.filter=null] - Optional text or keyword filter
   * @returns {Promise<{ success: boolean, logs: Array<{ timestamp: string, message: string, level?: string }>, error?: string }>}
   */
  static async fetchLogs({ limit = 30, filter = null } = {}) {
    const apiKey = config.render?.apiKey || process.env.RENDER_API_KEY;
    const ownerId = config.render?.ownerId || process.env.RENDER_OWNER_ID;
    const serviceId = config.render?.serviceId || process.env.RENDER_SERVICE_ID;

    if (!apiKey || !ownerId || !serviceId) {
      logger.error('RENDER_SERVICE', 'Render API credentials or service IDs are missing in configuration');
      return {
        success: false,
        error: 'CONFIGURATION_ERROR',
        message: 'Render integration is missing required configuration (RENDER_API_KEY, RENDER_OWNER_ID, or RENDER_SERVICE_ID).',
      };
    }

    // Sanitize and bound the limit between 1 and 100
    const boundedLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);

    const queryParams = new URLSearchParams({
      ownerId,
      resource: serviceId,
      limit: String(boundedLimit),
      direction: 'backward',
    });

    if (filter && typeof filter === 'string' && filter.trim().length > 0) {
      queryParams.set('text', filter.trim());
    }

    const apiUrl = `https://api.render.com/v1/logs?${queryParams.toString()}`;

    try {
      logger.info('RENDER_SERVICE', 'Requesting logs from Render API', {
        serviceId,
        limit: boundedLimit,
        hasFilter: Boolean(filter),
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6-second timeout

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        logger.error('RENDER_SERVICE', `Render API responded with HTTP status ${response.status}`, {
          status: response.status,
          responseBody: errorText.slice(0, 500),
        });

        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            error: 'AUTHENTICATION_FAILED',
            message: 'Render API authentication failed. Verify RENDER_API_KEY.',
          };
        }

        if (response.status === 404) {
          return {
            success: false,
            error: 'NOT_FOUND',
            message: 'Configured Render service or workspace was not found. Verify RENDER_SERVICE_ID and RENDER_OWNER_ID.',
          };
        }

        if (response.status === 429) {
          return {
            success: false,
            error: 'RATE_LIMITED',
            message: 'Render API rate limit exceeded. Please wait a moment before trying again.',
          };
        }

        return {
          success: false,
          error: 'API_ERROR',
          message: `Render API returned error status ${response.status}.`,
        };
      }

      const data = await response.json();

      // Normalize log entries (Render returns either an array of objects or an object with a logs array)
      let logEntries = [];
      if (Array.isArray(data)) {
        logEntries = data;
      } else if (Array.isArray(data?.logs)) {
        logEntries = data.logs;
      } else if (Array.isArray(data?.lines)) {
        logEntries = data.lines;
      }

      // If returned backward, reverse to chronological order for readability
      const normalizedLogs = logEntries
        .map((entry) => {
          if (typeof entry === 'string') {
            return { timestamp: null, message: entry };
          }
          return {
            timestamp: entry.timestamp || entry.time || null,
            message: entry.message || entry.text || entry.log || JSON.stringify(entry),
            level: entry.level || null,
          };
        })
        .reverse();

      return {
        success: true,
        serviceId,
        logs: normalizedLogs,
      };
    } catch (err) {
      if (err.name === 'AbortError') {
        logger.error('RENDER_SERVICE', 'Render API request timed out after 6000ms');
        return {
          success: false,
          error: 'TIMEOUT',
          message: 'Render API request timed out.',
        };
      }

      logger.error('RENDER_SERVICE', `Unexpected error fetching Render logs: ${err.message}`, {
        error: err.message,
      });

      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Could not connect to Render API. Please check server connectivity.',
      };
    }
  }
}

module.exports = RenderLogsService;
