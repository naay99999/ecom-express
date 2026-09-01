import { UnprocessableEntityError } from '../utils/errors.js';

/**
 * Converts untrusted request input into the parsed Zod result before it reaches
 * a controller, so services receive normalized data rather than raw strings.
 *
 * Usage: validate(createProductSchema) // defaults to 'body'
 *        validate(listProductsQuerySchema, 'query')
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(new UnprocessableEntityError('Validation failed', details));
    }

    // Express 5 makes req.query a getter with no setter, so a plain
    // `req.query = ...` throws; redefine the property instead. req.body and
    // req.params are still plain writable properties.
    if (source === 'query') {
      Object.defineProperty(req, 'query', { value: result.data, writable: true, enumerable: true, configurable: true });
    } else {
      req[source] = result.data;
    }
    next();
  };
}
