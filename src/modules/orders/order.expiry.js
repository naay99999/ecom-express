import logger from '../../config/logger.js';
import { expirePendingOrders } from './order.service.js';

const EXPIRY_INTERVAL_MS = 60_000;

export function startOrderExpiryWorker() {
  const timer = setInterval(() => {
    expirePendingOrders().catch((err) => logger.error({ err }, 'Failed to expire pending orders'));
  }, EXPIRY_INTERVAL_MS);
  timer.unref();
  return () => clearInterval(timer);
}
