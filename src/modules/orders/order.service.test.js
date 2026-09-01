import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  cart: { userId: 'user-1', items: [{ productId: 'product-1', variantId: 'variant-1', quantity: 2 }] },
  order: null,
  deletedCart: false,
  product: { _id: 'product-1', name: 'Keyboard', slug: 'keyboard' },
  variant: { _id: 'variant-1', sku: 'KEYBOARD-DEFAULT', options: {}, priceAmount: 89900, stock: 3 },
}));

vi.mock('mongoose', () => ({
  default: {
    startSession: vi.fn(async () => ({
      withTransaction: async (callback) => callback(),
      endSession: vi.fn(),
    })),
  },
}));

vi.mock('../cart/cart.model.js', () => ({
  default: {
    findOne: vi.fn(() => ({ session: async () => state.cart })),
    deleteOne: vi.fn(async () => { state.deletedCart = true; }),
  },
}));

vi.mock('../products/product.model.js', () => ({
  default: {
    findOneAndUpdate: vi.fn(async (filter) => {
      const requested = filter.variants.$elemMatch;
      if (filter._id === state.product._id && requested._id === state.variant._id && requested.stock.$gte <= state.variant.stock) {
        state.variant.stock -= requested.stock.$gte;
        return { ...state.product, variants: { id: () => ({ ...state.variant }) } };
      }
      return null;
    }),
    updateOne: vi.fn(),
  },
}));

vi.mock('../users/user.model.js', () => ({
  default: {
    findById: vi.fn(() => ({
      session: async () => ({
        addresses: {
          id: (id) => (id === 'address-1'
            ? { label: 'Home', line1: '1 Main St', city: 'Bangkok', postalCode: '10100', country: 'TH' }
            : null),
        },
      }),
    })),
  },
}));

vi.mock('./order.model.js', () => ({
  default: {
    create: vi.fn(async ([data]) => {
      state.order = data;
      return [data];
    }),
  },
}));

const { checkoutOrder } = await import('./order.service.js');

describe('checkoutOrder', () => {
  it('creates a pending THB order, reserves stock, and clears the cart', async () => {
    state.cart = { userId: 'user-1', items: [{ productId: 'product-1', variantId: 'variant-1', quantity: 2 }] };
    state.variant.stock = 3;
    state.order = null;
    state.deletedCart = false;

    const order = await checkoutOrder('user-1', { addressId: 'address-1' });

    expect(order).toMatchObject({ status: 'pending', currency: 'THB', subtotalAmount: 179800, totalAmount: 179800 });
    expect(state.order.items).toEqual([
      expect.objectContaining({ productId: 'product-1', variantId: 'variant-1', sku: 'KEYBOARD-DEFAULT', unitPriceAmount: 89900, quantity: 2, lineTotalAmount: 179800 }),
    ]);
    expect(state.order.shippingAddress).toMatchObject({ line1: '1 Main St', country: 'TH' });
    expect(state.variant.stock).toBe(1);
    expect(state.deletedCart).toBe(true);
  });
});
