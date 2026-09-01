import { describe, expect, it } from 'vitest';
import { addCartItemSchema, updateCartItemSchema } from './cart.schema.js';

describe('cart schemas', () => {
  it('accepts a product id, variant id, and positive quantity when adding an item', () => {
    expect(
      addCartItemSchema.parse({
        productId: '665f1a2b3c4d5e6f7a8b9c0e',
        variantId: '665f1a2b3c4d5e6f7a8b9c0f',
        quantity: 2,
      }),
    ).toEqual({ productId: '665f1a2b3c4d5e6f7a8b9c0e', variantId: '665f1a2b3c4d5e6f7a8b9c0f', quantity: 2 });
  });

  it('requires a variant id when adding an item', () => {
    expect(addCartItemSchema.safeParse({ productId: '665f1a2b3c4d5e6f7a8b9c0e', quantity: 2 }).success).toBe(false);
  });

  it('rejects zero quantity when updating an item', () => {
    expect(updateCartItemSchema.safeParse({ quantity: 0 }).success).toBe(false);
  });
});
