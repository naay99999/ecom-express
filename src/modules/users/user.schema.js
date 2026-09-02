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

/**
 * Stripe's address object (Customer, PaymentIntent shipping, Checkout
 * session shipping_details, ...) is the same six generic fields for every
 * country — line1/line2/city/state/postal_code/country, no dedicated
 * sub-district/district fields — so this schema stays 1:1 with it instead
 * of growing separate ตำบล/อำเภอ/จังหวัด fields. For a Thai address
 * (country: 'TH'): line1 = บ้านเลขที่/หมู่/ซอย/ถนน, line2 = ตำบล/แขวง
 * plus any extra detail, city = อำเภอ/เขต (district), state = จังหวัด
 * (province, required for TH), postalCode = 5-digit Thai postal code.
 */
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
  .strict()
  .refine((value) => value.country !== 'TH' || /^\d{5}$/.test(value.postalCode), {
    message: 'Thai postal codes must be 5 digits',
    path: ['postalCode'],
  })
  .refine((value) => value.country !== 'TH' || !!value.state?.trim(), {
    message: 'Province (state) is required for Thai addresses',
    path: ['state'],
  });

export const listUsersQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    role: z.enum(['customer', 'admin']).optional(),
    search: z.string().trim().min(1).max(100).optional(),
  })
  .strict();
