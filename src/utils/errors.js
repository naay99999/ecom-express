/**
 * Application error vocabulary. Services and middleware throw these so the
 * centralized error handler can return consistent client-safe responses.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', details) {
    super(message, 400, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details) {
    super(message, 401, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details) {
    super(message, 403, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details) {
    super(message, 404, details);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details) {
    super(message, 409, details);
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message = 'Unprocessable entity', details) {
    super(message, 422, details);
  }
}
