import { z } from 'zod';

const optionNameSchema = z.string().trim().min(1).max(50);
const variantCreateSchema = z.object({
  sku: z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9._-]{0,63}$/, 'SKU must use uppercase letters, numbers, dots, underscores, or hyphens'),
  options: z.record(z.string(), z.string().trim().min(1).max(100)),
  priceAmount: z.coerce.number().int().min(0),
  stock: z.coerce.number().int().min(0).default(0),
  images: z.array(z.url()).optional(),
  isActive: z.boolean().optional(),
}).strict();

const variantUpdateSchema = variantCreateSchema.extend({
  _id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid variant id').optional(),
}).strict();

function validateVariants(value, ctx) {
  if (!value.optionNames || !value.variants) return;
  const names = value.optionNames;
  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
    ctx.addIssue({ code: 'custom', path: ['optionNames'], message: 'Option names must be unique' });
  }
  if (!names.length && value.variants.length !== 1) {
    ctx.addIssue({ code: 'custom', path: ['variants'], message: 'Products without options must have exactly one default variant' });
  }

  const combinations = new Set();
  value.variants.forEach((variant, index) => {
    const keys = Object.keys(variant.options).sort();
    const expected = [...names].sort();
    if (keys.length !== expected.length || keys.some((key, keyIndex) => key !== expected[keyIndex])) {
      ctx.addIssue({ code: 'custom', path: ['variants', index, 'options'], message: 'Variant options must exactly match optionNames' });
      return;
    }
    const combination = names.map((name) => variant.options[name]).join('\u0000');
    if (combinations.has(combination)) {
      ctx.addIssue({ code: 'custom', path: ['variants', index, 'options'], message: 'Variant option combinations must be unique' });
    }
    combinations.add(combination);
  });
}

/** Product body and query contracts; coercion turns supported query values into usable numbers. */
const productFieldsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
  description: z.string().max(2000).optional(),
  category: z.string().trim().max(100).optional(),
  optionNames: z.array(optionNameSchema).max(3),
  variants: z.array(variantCreateSchema).min(1).max(100),
  images: z.array(z.url()).optional(),
}).strict();

export const createProductSchema = productFieldsSchema.superRefine(validateVariants);

const productUpdateFieldsSchema = productFieldsSchema.extend({
  variants: z.array(variantUpdateSchema).min(1).max(100),
});

export const updateProductSchema = productUpdateFieldsSchema.partial().superRefine((value, ctx) => {
  if (!Object.keys(value).length) ctx.addIssue({ code: 'custom', message: 'At least one field is required' });
  if (Object.hasOwn(value, 'optionNames') !== Object.hasOwn(value, 'variants')) {
    ctx.addIssue({ code: 'custom', message: 'optionNames and variants must be updated together' });
  }
  validateVariants(value, ctx);
});

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  category: z.string().trim().optional(),
  search: z.string().trim().min(1).max(100).optional(),
}).strict();

export const listAdminProductsQuerySchema = listProductsQuerySchema.extend({
  status: z.enum(['active', 'archived', 'all']).default('all'),
});
