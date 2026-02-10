import app from './app';
import config from './config/env.config';
import database from './config/database.config';
import logger from './utils/logger';

const startServer = async () => {
  try {
    await database.connect();

    // Start server
    const server = app.listen(config.PORT, () => {
      logger.info(`Server started successfully`);
      logger.info(`Running at: http://localhost:${config.PORT}`);

      if (config.NODE_ENV !== 'production') {
        logger.info(`API Docs: http://localhost:${config.PORT}/api-docs`);
      }

      logger.info(`Health Check: http://localhost:${config.PORT}/health`);
      logger.info(`Environment: ${config.NODE_ENV}`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        await database.disconnect();
        logger.info('Database connection closed');

        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
