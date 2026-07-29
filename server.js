const app = require('./src/app');
const config = require('./src/config');
const { verifyEmailConfig } = require('./src/config/email');
const prisma = require('./src/utils/db');
const { logger } = require('./src/utils/db');

// Validate critical configuration on startup
try {
  if (typeof config.validateConfig === 'function') {
    config.validateConfig();
  }
} catch (configError) {
  logger.fatal('CONFIG', `Application configuration error: ${configError.message}`, { error: configError });
  process.exit(1);
}

const PORT = config.port;
const NODE_ENV = config.nodeEnv;

logger.info('SERVER', 'Starting Customer Services backend application...', { port: PORT, env: NODE_ENV });

const server = app.listen(PORT, async () => {
  logger.info('SERVER', `Server started successfully on port ${PORT} (${NODE_ENV} environment)`);

  try {
    logger.info('DATABASE', 'Testing database & email transport configuration...');
    await verifyEmailConfig();
    logger.info('SERVER', 'All startup checks completed successfully.');
  } catch (error) {
    logger.fatal('SERVER', `Startup check failed, shutting down server: ${error.message}`, { error });
    server.close(() => {
      process.exit(1);
    });
  }
});

// Process Crash Handler: Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  logger.fatal('PROCESS', 'Unhandled Promise Rejection encountered', {
    type: 'unhandledRejection',
    reason: reason?.message || String(reason),
    stack: reason?.stack || null,
  });

  if (server && server.listening) {
    server.close(() => {
      logger.fatal('PROCESS', 'Server closed due to unhandled rejection. Exiting process.');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Process Crash Handler: Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.fatal('PROCESS', `Uncaught Exception encountered: ${err.message}`, {
    type: 'uncaughtException',
    message: err.message,
    stack: err.stack,
  });

  if (server && server.listening) {
    server.close(() => {
      logger.fatal('PROCESS', 'Server closed due to uncaught exception. Exiting process.');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Graceful Shutdown Signal Handlers (SIGINT / SIGTERM)
const gracefulShutdown = (signal) => {
  logger.info('SERVER', `Received ${signal} signal. Initiating graceful shutdown...`);

  server.close(async () => {
    logger.info('SERVER', 'HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('DATABASE', 'Prisma database client disconnected.');
    } catch (dbErr) {
      logger.error('DATABASE', `Error disconnecting database during shutdown: ${dbErr.message}`, { error: dbErr });
    }
    logger.info('SERVER', 'Application shutdown complete.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
