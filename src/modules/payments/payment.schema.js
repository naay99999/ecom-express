import { z } from 'zod';
import { objectIdSchema } from '../users/user.schema.js';

export const createCheckoutSessionSchema = z.object({ orderId: objectIdSchema }).strict();
