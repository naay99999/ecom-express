import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid resource id');
export const userIdParamsSchema = z.object({ id: objectIdSchema }).strict();
export const addressIdParamsSchema = z.object({ addressId: objectIdSchema }).strict();

const optionalNonEmptyString = (max) => z.string().trim().min(1).max(max).optional();

export const updateMeSchema = z
  .object({ name: optionalNonEmptyString(100), phone: optionalNonEmptyString(30) })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const updateUserSchema = z
  .object({
    name: optionalNonEmptyString(100),
    phone: optionalNonEmptyString(30),
    role: z.enum(['customer', 'admin']).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required');

export const addressSchema = z
  .object({
    label: z.string().trim().min(1).max(50).optional(),
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().min(1).max(30),
    country: z.string().trim().min(2).max(2).toUpperCase(),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const listUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    role: z.enum(['customer', 'admin']).optional(),
    search: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
