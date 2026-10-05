// Configuration file
const config = {
  development: {
    port: process.env.PORT || 5000,
    nodeEnv: 'development',
    dbUrl: process.env.DATABASE_URL,
    apiBaseUrl: 'http://localhost:5000',
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  production: {
    port: process.env.PORT || 8000,
    nodeEnv: 'production',
    dbUrl: process.env.DATABASE_URL,
    apiBaseUrl: 'https://take-you-forward-app.onrender.com',
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  testing: {
    port: 5001,
    nodeEnv: 'testing',
    dbUrl: process.env.DATABASE_URL,
    apiBaseUrl: 'http://localhost:5001',
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  }
};

const environment = process.env.NODE_ENV || 'development';
const activeConfig = config[environment] || config.development;

const validateConfig = () => {
  const missing = [];
  if (!process.env.DATABASE_URL && environment === 'production') {
    missing.push('DATABASE_URL');
  }
  if (!activeConfig.jwtSecret && environment === 'production') {
    missing.push('JWT_SECRET');
  }

  if (missing.length > 0) {
    const errorMsg = `Missing required environment variable(s): ${missing.join('; ')}`;
    console.error(`[FATAL] [CONFIG] ${errorMsg}`);
    const error = new Error(errorMsg);
    error.code = 'CONFIG_VALIDATION_FAILED';
    error.missingVariables = missing;
    error.expectedVariables = {
      databaseUrl: ['DATABASE_URL'],
      jwtSecret: ['JWT_SECRET'],
    };
    throw error;
  }

  return true;
};

module.exports = {
  ...activeConfig,
  validateConfig,
};

