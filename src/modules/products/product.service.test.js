import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ product: { _id: 'product-1', isActive: true, archivedAt: null } }));

vi.mock('./product.model.js', () => ({
  default: {
    findByIdAndUpdate: vi.fn(async (id, update) => {
      if (id !== state.product._id) return null;
      Object.assign(state.product, update.$set);
      return { ...state.product };
    }),
  },
}));

const { archiveProduct, restoreProduct } = await import('./product.service.js');

describe('product archiving', () => {
  it('archives and restores a product without deleting it', async () => {
    state.product = { _id: 'product-1', isActive: true, archivedAt: null };

    const archived = await archiveProduct('product-1');
    const restored = await restoreProduct('product-1');

    expect(archived).toMatchObject({ isActive: false });
    expect(archived.archivedAt).toBeInstanceOf(Date);
    expect(restored).toMatchObject({ isActive: true, archivedAt: null });
  });
});
