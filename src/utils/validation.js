import { z } from 'zod';
import { validate } from '../middleware/validate.middleware.js';

export const objectIdParamsSchema = z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid resource id') }).strict();
export const validateObjectId = validate(objectIdParamsSchema, 'params');
