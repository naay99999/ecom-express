import { describe, expect, it } from 'vitest';
import { createProductSchema, updateProductSchema } from './product.schema.js';

describe('product price schema', () => {
  it('requires a default variant with a SKU and satang price', () => {
    expect(
      createProductSchema.parse({
        name: 'Mechanical Keyboard',
        slug: 'mechanical-keyboard',
        optionNames: [],
        variants: [{ sku: 'KEYBOARD-DEFAULT', options: {}, priceAmount: 89900, stock: 25 }],
      }),
    ).toMatchObject({ variants: [{ sku: 'KEYBOARD-DEFAULT', priceAmount: 89900, stock: 25 }] });
  });

  it('rejects a legacy product-level price and stock', () => {
    expect(
      createProductSchema.safeParse({
        name: 'Mechanical Keyboard',
        slug: 'mechanical-keyboard',
        priceAmount: 89900,
        stock: 25,
      }).success,
    ).toBe(false);
  });

  it('rejects duplicated option combinations', () => {
    expect(
      createProductSchema.safeParse({
        name: 'T-Shirt',
        slug: 't-shirt',
        optionNames: ['Color', 'Size'],
        variants: [
          { sku: 'TSHIRT-BLACK-M', options: { Color: 'Black', Size: 'M' }, priceAmount: 49900, stock: 5 },
          { sku: 'TSHIRT-BLACK-M-2', options: { Color: 'Black', Size: 'M' }, priceAmount: 49900, stock: 5 },
        ],
      }).success,
    ).toBe(false);
  });

  it('accepts existing variant ids when updating variants', () => {
    expect(
      updateProductSchema.parse({
        optionNames: [],
        variants: [{ _id: '665f1a2b3c4d5e6f7a8b9c0f', sku: 'KEYBOARD-DEFAULT', options: {}, priceAmount: 89900, stock: 30 }],
      }),
    ).toMatchObject({ variants: [{ _id: '665f1a2b3c4d5e6f7a8b9c0f', stock: 30 }] });
  });
});
