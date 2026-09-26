/**
 * Utility to scrub secrets and format Render logs into Slack Block Kit messages.
 */

// Regex patterns for sensitive data redaction
const SENSITIVE_PATTERNS = [
  // Database connection URLs (e.g., postgresql://user:pass@host/db)
  {
    pattern: /postgres(?:ql)?:\/\/[^\s"'<>]+/gi,
    replacement: '[REDACTED_DB_URL]',
  },
  // Bearer authentication headers
  {
    pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
    replacement: 'Bearer [REDACTED]',
  },
  // JWT tokens (three base64url segments separated by dots)
  {
    pattern: /eyJ[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]{10,}\.[A-Za-z0-9-_]+/g,
    replacement: '[REDACTED_JWT]',
  },
  // Key-value pairs for passwords, tokens, secrets, passcodes
  {
    pattern: /(?:password|passcode|secret|api_?key|token)\s*[:=]\s*["']?([^"' \n]+)["']?/gi,
    replacement: (match, p1) => match.replace(p1, '[REDACTED]'),
  },
];

/**
 * Sanitizes a string by replacing sensitive data matches with redaction labels.
 *
 * @param {string} text - Raw log string
 * @returns {string} - Scrubbed string
 */
const sanitizeLogLine = (text) => {
  if (!text || typeof text !== 'string') return '';

  let sanitized = text;
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement);
  }
  return sanitized;
};

/**
 * Formats a timestamp into HH:mm:ss or extracts from ISO format.
 *
 * @param {string} timestamp
 * @returns {string}
 */
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().slice(11, 19); // HH:mm:ss
  } catch {
    return '';
  }
};

/**
 * Formats an array of log objects into a Slack Block Kit payload.
 *
 * @param {Object} params
 * @param {string} params.serviceId - The Render service ID
 * @param {Array<{ timestamp?: string, message: string, level?: string }>} params.logs - Log entries
 * @param {string} [params.filter] - Optional filter applied
 * @returns {Object} - Slack message payload
 */
const formatLogsForSlack = ({ serviceId, logs = [], filter = null }) => {
  if (!logs || logs.length === 0) {
    return {
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📋 Render Logs: No Entries Found',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `No recent logs were found for service \`${serviceId}\`${filter ? ` matching filter "*${filter}*"` : ''}.`,
          },
        },
      ],
    };
  }

  // Sanitize and format each line
  const lines = logs.map((log) => {
    const timeStr = formatTimestamp(log.timestamp);
    const prefix = timeStr ? `[${timeStr}] ` : '';
    const cleanMsg = sanitizeLogLine(log.message || '');
    // Truncate individual line if excessively long (> 180 chars)
    const truncatedMsg = cleanMsg.length > 180 ? `${cleanMsg.slice(0, 177)}...` : cleanMsg;
    return `${prefix}${truncatedMsg}`;
  });

  // Slack text blocks are strictly capped at 3,000 characters.
  // We keep the code block safely below 2,800 chars.
  const MAX_BLOCK_CHARS = 2700;
  let codeBlockContent = '';
  let linesIncluded = 0;
  let isTruncated = false;

  // Build from the end (most recent) backwards to fit the most recent lines
  const selectedLines = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const candidate = lines[i];
    const candidateLength = candidate.length + 1; // + newline
    const currentLength = selectedLines.join('\n').length;

    if (currentLength + candidateLength > MAX_BLOCK_CHARS) {
      isTruncated = true;
      break;
    }
    selectedLines.unshift(candidate);
    linesIncluded++;
  }

  codeBlockContent = selectedLines.join('\n');
  if (isTruncated) {
    codeBlockContent = `... [Earlier lines truncated to fit Slack limit] ...\n${codeBlockContent}`;
  }

  return {
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📋 Recent Render Logs',
          emoji: true,
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Service:* \`${serviceId}\` | *Lines:* \`${linesIncluded} of ${logs.length}\`${filter ? ` | *Filter:* \`${filter}\`` : ''}`,
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '```\n' + codeBlockContent + '\n```',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '🔒 _Credentials, DB connection strings, and tokens were automatically sanitized._',
          },
        ],
      },
    ],
  };
};

/**
 * Formats an error notification into a Slack Block Kit payload.
 *
 * @param {string} title
 * @param {string} message
 * @returns {Object}
 */
const formatErrorForSlack = (title, message) => {
  return {
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `⚠️ ${title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
        },
      },
    ],
  };
};

module.exports = {
  sanitizeLogLine,
  formatLogsForSlack,
  formatErrorForSlack,
};
