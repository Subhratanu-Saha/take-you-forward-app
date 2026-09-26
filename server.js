const app = require('./src/app');
const config = require('./src/config');
const { verifyEmailConfig } = require('./src/config/email');
const prisma = require('./src/utils/db');
const { logger } = require('./src/utils/db');
const { isBackgroundRejection } = require('./src/utils/rejectionHandler');

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
const DRAIN_TIMEOUT_MS = parseInt(
  process.env.SHUTDOWN_DRAIN_TIMEOUT_MS || process.env.DRAIN_TIMEOUT_MS || '10000',
  10
);

let isShuttingDown = false;
let server = null;

if (process.env.NO_AUTO_SERVER_START !== 'true') {
  server = app.listen(PORT, () => {
    console.log(`
  ╔══════════════════════════════════════╗
  ║  Backend Server Started Successfully ║
  ║  Port: ${PORT}                           
  ║  Environment: ${NODE_ENV}              
  ╚══════════════════════════════════════╝
  `);

    logger.info('SERVER', `Server started successfully on port ${PORT} [${NODE_ENV}]`);

    // Non-blocking asynchronous SMTP verification
    verifyEmailConfig()
      .then((isReady) => {
        if (isReady) {
          logger.info('EMAIL', 'SMTP Transporter verified successfully.');
        } else {
          logger.warn('EMAIL', 'SMTP Transporter operating in degraded mode.');
        }
      })
      .catch((err) => {
        logger.error('EMAIL', `SMTP verification failed in background: ${err.message}`, { error: err });
      });
  });
}

// Graceful Shutdown Signal Handlers (SIGINT / SIGTERM / Fatal error) with 10s drain period
const gracefulShutdown = (signal, exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(
    'SERVER',
    `Received ${signal} signal. Initiating graceful shutdown with ${DRAIN_TIMEOUT_MS}ms drain period...`
  );

  // Force exit after drain timeout if connections do not terminate in time
  const drainTimer = setTimeout(() => {
    logger.warn('SERVER', `Drain period of ${DRAIN_TIMEOUT_MS}ms expired. Forcing exit.`);
    if (!process.env.TEST_NO_EXIT) {
      process.exit(exitCode);
    }
  }, DRAIN_TIMEOUT_MS);
  if (drainTimer.unref) drainTimer.unref();

  const cleanup = async () => {
    clearTimeout(drainTimer);
    try {
      await prisma.$disconnect();
      logger.info('DATABASE', 'Prisma database client disconnected.');
    } catch (dbErr) {
      logger.error('DATABASE', `Error disconnecting database during shutdown: ${dbErr.message}`, { error: dbErr });
    }
    logger.info('SERVER', 'Application shutdown complete.');
    if (!process.env.TEST_NO_EXIT) {
      process.exit(exitCode);
    }
  };

  if (server && server.listening) {
    server.close(() => {
      logger.info('SERVER', 'HTTP server closed.');
      cleanup();
    });
  } else {
    cleanup();
  }
};

// Process Crash Handler: Handle unhandled promise rejections
const handleUnhandledRejection = (err, promise) => {
  if (isBackgroundRejection(err, promise)) {
    // Non-critical background task rejection: log full stack trace and DO NOT terminate server
    logger.error('PROCESS', `Unhandled background promise rejection: ${err?.message || String(err)}`, {
      type: 'unhandledRejection',
      isBackground: true,
      reason: err?.message || String(err),
      stack: err?.stack || null,
      error: err instanceof Error ? err : undefined,
    });
    return;
  }

  // Critical core request rejection: log fatal with full stack trace and begin graceful drain shutdown
  logger.fatal('PROCESS', `Unhandled Promise Rejection encountered: ${err?.message || String(err)}`, {
    type: 'unhandledRejection',
    isBackground: false,
    reason: err?.message || String(err),
    stack: err?.stack || null,
    error: err instanceof Error ? err : undefined,
  });

  gracefulShutdown('unhandledRejection', 1);
};

process.on('unhandledRejection', handleUnhandledRejection);

// Process Crash Handler: Handle uncaught exceptions
const handleUncaughtException = (err) => {
  logger.fatal('PROCESS', `Uncaught Exception: ${err.message}`, {
    type: 'uncaughtException',
    message: err.message,
    stack: err.stack,
  });

  gracefulShutdown('uncaughtException', 1);
};

process.on('uncaughtException', handleUncaughtException);

process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));

module.exports = {
  server,
  gracefulShutdown,
  handleUnhandledRejection,
  handleUncaughtException,
};
