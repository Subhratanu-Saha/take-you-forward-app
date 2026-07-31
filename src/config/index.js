// Configuration file
const config = {
  development: {
    port: process.env.PORT || 5000,
    nodeEnv: 'development',
    dbUrl: process.env.DB_URL || 'mongodb://localhost:27017/take-you-forward',
    apiBaseUrl: 'http://localhost:5000'
  },
  production: {
    port: process.env.PORT || 8000,
    nodeEnv: 'production',
    dbUrl: process.env.DB_URL,
    apiBaseUrl: 'https://take-you-forward-app.onrender.com'
  },
  testing: {
    port: 5001,
    nodeEnv: 'testing',
    dbUrl: 'mongodb://localhost:27017/take-you-forward-test',
    apiBaseUrl: 'http://localhost:5001'
  }
};

const environment = process.env.NODE_ENV || 'development';
const activeConfig = config[environment] || config.development;

const validateConfig = () => {
  const missing = [];
  if (!process.env.DATABASE_URL && !process.env.DB_URL && environment === 'production') {
    missing.push('DATABASE_URL');
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
  validateConfig,
};

