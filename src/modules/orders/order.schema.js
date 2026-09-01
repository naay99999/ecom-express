import { z } from 'zod';
import { objectIdSchema } from '../users/user.schema.js';

export const orderIdParamsSchema = z.object({ id: objectIdSchema }).strict();
export const checkoutOrderSchema = z.object({ addressId: objectIdSchema }).strict();
export const listOrdersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(['pending', 'cancelled', 'expired']).optional(),
  })
  .strict();
