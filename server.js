const app = require('./src/app');
const config = require('./src/config');
const { verifyEmailConfig } = require('./src/config/email');
const prisma = require('./src/utils/db');
const { logger } = require('./src/utils/db');
const monitoringService = require('./src/services/monitoringService');
const { classifyRejection } = require('./src/utils/rejectionHandler');

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
// Process Crash Handler: Handle unhandled promise rejections
const handleUnhandledRejection = async (err, promise) => {
  const classification = classifyRejection(err, promise);

  if (classification.isBackground) {
    // Non-critical background task unhandled rejection:
    // Log full stack trace, dispatch emergency alert, DO NOT crash server.
    logger.error(
      'PROCESS',
      `[BACKGROUND_UNHANDLED_REJECTION] Non-critical background promise rejection: ${err?.message || String(err)}`,
      {
        type: 'unhandledRejection',
        origin: 'background',
        isBackground: true,
        detectionReason: classification.detectionReason,
        reason: err?.message || String(err),
        stack: err?.stack || null,
        metadata: classification.metadata,
        error: err instanceof Error ? err : undefined,
      }
    );

    try {
      await monitoringService.sendEmergencyAlert(err, {
        type: 'unhandledRejection',
        origin: 'background',
        severity: 'error',
        detectionReason: classification.detectionReason,
        stack: err?.stack || null,
        metadata: classification.metadata,
      });
    } catch (alertErr) {
      logger.error('MONITORING', `Failed to dispatch emergency alert: ${alertErr.message}`, { error: alertErr });
    }

    return;
  }

  // Critical core request lifecycle or system unhandled rejection:
  logger.fatal(
    'PROCESS',
    `[CORE_UNHANDLED_REJECTION] Unhandled Promise Rejection in core request lifecycle: ${err?.message || String(err)}`,
    {
      type: 'unhandledRejection',
      origin: 'core',
      isBackground: false,
      detectionReason: classification.detectionReason,
      reason: err?.message || String(err),
      stack: err?.stack || null,
      metadata: classification.metadata,
      error: err instanceof Error ? err : undefined,
    }
  );

  try {
    await monitoringService.sendEmergencyAlert(err, {
      type: 'unhandledRejection',
      origin: 'core',
      severity: 'fatal',
      detectionReason: classification.detectionReason,
      stack: err?.stack || null,
      metadata: classification.metadata,
    });
  } catch (alertErr) {
    logger.error('MONITORING', `Failed to dispatch emergency alert: ${alertErr.message}`, { error: alertErr });
  }

  // Initiate orderly shutdown with graceful drain period (10–15s)
  gracefulShutdown('unhandledRejection', 1);
};

process.on('unhandledRejection', handleUnhandledRejection);

// Process Crash Handler: Handle uncaught exceptions
const handleUncaughtException = async (err) => {
  logger.fatal('PROCESS', `Uncaught Exception: ${err.message}`, {
    type: 'uncaughtException',
    message: err.message,
    stack: err.stack,
  });

  try {
    await monitoringService.sendEmergencyAlert(err, {
      type: 'uncaughtException',
      origin: 'core',
      severity: 'fatal',
      stack: err.stack,
    });
  } catch (alertErr) {
    logger.error('MONITORING', `Failed to dispatch emergency alert: ${alertErr.message}`, { error: alertErr });
  }

  gracefulShutdown('uncaughtException', 1);
};

process.on('uncaughtException', handleUncaughtException);

// Graceful Shutdown Signal Handlers (SIGINT / SIGTERM / Fatal error) with drain period
const gracefulShutdown = (signal, exitCode = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(
    'SERVER',
    `Received ${signal} signal. Initiating graceful shutdown with ${DRAIN_TIMEOUT_MS}ms drain period...`
  );

  const drainTimer = setTimeout(() => {
    logger.warn('SERVER', `Drain period of ${DRAIN_TIMEOUT_MS}ms expired. Forcing exit.`);
    if (!process.env.TEST_NO_EXIT) {
      process.exit(exitCode);
    }
  }, DRAIN_TIMEOUT_MS);
  if (drainTimer.unref) drainTimer.unref();

  if (server && server.listening) {
    server.close(async () => {
      clearTimeout(drainTimer);
      logger.info('SERVER', 'HTTP server closed.');
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
    });
  } else {
    clearTimeout(drainTimer);
    if (!process.env.TEST_NO_EXIT) {
      process.exit(exitCode);
    }
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));

module.exports = {
  server,
  gracefulShutdown,
  handleUnhandledRejection,
  handleUncaughtException,
};
