import { z } from 'zod';
import { objectIdSchema } from '../users/user.schema.js';
import { getShippingMethodKeys } from '../../utils/shipping/shipping.registry.js';

const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'expired'];

export const orderIdParamsSchema = z.object({ id: objectIdSchema }).strict();

export const checkoutOrderSchema = z
  .object({
    addressId: objectIdSchema,
    paymentMethod: z.enum(['cod', 'stripe']),
    shippingMethod: z.enum(getShippingMethodKeys()),
  })
  .strict();

export const shipOrderSchema = z
  .object({
    carrier: z.string().trim().min(1).max(100),
    trackingNumber: z.string().trim().min(1).max(200),
  })
  .strict();

export const listOrdersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: z.enum(ORDER_STATUSES).optional(),
    paymentMethod: z.enum(['cod', 'stripe']).optional(),
  })
  .strict();
