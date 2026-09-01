import { ZodError } from 'zod';
import mongoose from 'mongoose';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { AppError, NotFoundError } from '../utils/errors.js';

/**
 * Final Express error layer: it translates known library errors into the API's
 * response envelope and hides unexpected details outside development.
 */
export function notFoundHandler(req, res, next) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let error = err;

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }));
    error = new AppError('Validation failed', 422, details);
  } else if (error instanceof mongoose.Error.CastError) {
    error = new AppError(`Invalid ${error.path}: ${error.value}`, 400);
  } else if (error instanceof mongoose.Error.ValidationError) {
    error = new AppError('Validation failed', 422, Object.values(error.errors).map((e) => e.message));
  } else if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {}).join(', ');
    error = new AppError(`Duplicate value for field: ${field}`, 409, error.keyValue);
  } else if (error.name === 'JsonWebTokenError' || error.name === 'JWTExpired' || error.code === 'ERR_JWT_EXPIRED') {
    error = new AppError('Invalid or expired token', 401);
  }

  const statusCode = error.statusCode || 500;
  const isOperational = error.isOperational ?? false;

  if (!isOperational || statusCode >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, error.message);
  }

  res.status(statusCode).json({
    success: false,
    message: isOperational ? error.message : 'Internal server error',
    ...(error.details ? { details: error.details } : {}),
    ...(env.NODE_ENV === 'development' && !isOperational ? { stack: err.stack } : {}),
  });
}
