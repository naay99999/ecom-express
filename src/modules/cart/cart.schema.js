import { z } from 'zod';
import { objectIdSchema } from '../users/user.schema.js';

export const cartVariantIdParamsSchema = z.object({ variantId: objectIdSchema }).strict();

export const addCartItemSchema = z
  .object({ productId: objectIdSchema, variantId: objectIdSchema, quantity: z.coerce.number().int().min(1).max(100) })
  .strict();

export const updateCartItemSchema = z.object({ quantity: z.coerce.number().int().min(1).max(100) }).strict();
