// Configuration file
const config = {
  development: {
    port: process.env.PORT || 5000,
    nodeEnv: 'development',
    dbUrl: process.env.DB_URL || 'mongodb://localhost:27017/take-you-forward',
    apiBaseUrl: 'http://localhost:5000',
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  production: {
    port: process.env.PORT || 8000,
    nodeEnv: 'production',
    dbUrl: process.env.DB_URL,
    apiBaseUrl: 'https://take-you-forward-app.onrender.com',
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  testing: {
    port: 5001,
    nodeEnv: 'testing',
    dbUrl: 'mongodb://localhost:27017/take-you-forward-test',
    apiBaseUrl: 'http://localhost:5001',
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  }
};

const environment = process.env.NODE_ENV || 'development';
const activeConfig = config[environment] || config.development;

const commonConfig = {
  slack: {
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    allowedChannelId: process.env.SLACK_ALLOWED_CHANNEL_ID,
    // Optional workspace and user restrictions
    allowedTeamId: process.env.SLACK_ALLOWED_TEAM_ID && process.env.SLACK_ALLOWED_TEAM_ID.trim()
      ? process.env.SLACK_ALLOWED_TEAM_ID.trim()
      : null,
    allowedUserIds: process.env.SLACK_ALLOWED_USER_IDS && process.env.SLACK_ALLOWED_USER_IDS.trim()
      ? process.env.SLACK_ALLOWED_USER_IDS.split(',').map((id) => id.trim()).filter(Boolean)
      : null,
  },
  render: {
    apiKey: process.env.RENDER_API_KEY,
    ownerId: process.env.RENDER_OWNER_ID,
    serviceId: process.env.RENDER_SERVICE_ID,
  },
};

const validateConfig = () => {
  const missing = [];
  if (!process.env.DATABASE_URL && !process.env.DB_URL && environment === 'production') {
    missing.push('DATABASE_URL');
  }
  if (!activeConfig.jwtSecret && environment === 'production') {
    missing.push('JWT_SECRET');
  }
  if (process.env.SLACK_SIGNING_SECRET && environment === 'production') {
    if (!process.env.RENDER_API_KEY) missing.push('RENDER_API_KEY');
    if (!process.env.RENDER_OWNER_ID) missing.push('RENDER_OWNER_ID');
    if (!process.env.RENDER_SERVICE_ID) missing.push('RENDER_SERVICE_ID');
  }

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variable(s): ${missing.join(', ')}`;
    console.error(`[FATAL] [CONFIG] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  return true;
};

module.exports = {
  ...activeConfig,
  ...commonConfig,
  validateConfig,
};

