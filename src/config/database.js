import mongoose from 'mongoose';
import env from './env.js';
import logger from './logger.js';

/** MongoDB connection lifecycle used by server startup and graceful shutdown. */
mongoose.set('strictQuery', true);

export async function connectDatabase() {
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  await mongoose.connect(env.MONGO_URI);

  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
