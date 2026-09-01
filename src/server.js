import app from './app.js';
import env from './config/env.js';
import logger from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { startOrderExpiryWorker } from './modules/orders/order.expiry.js';

/**
 * Process entry point: connect to MongoDB before accepting traffic, then close
 * both HTTP and database connections when the process receives a shutdown signal.
 */
async function start() {
  await connectDatabase();
  const stopOrderExpiryWorker = startOrderExpiryWorker();

  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on http://localhost:${env.PORT}`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} received, shutting down gracefully`);
    stopOrderExpiryWorker();
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
