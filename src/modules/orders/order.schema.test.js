import { describe, expect, it } from 'vitest';
import { checkoutOrderSchema, listOrdersQuerySchema } from './order.schema.js';

describe('order schemas', () => {
  it('accepts a saved address id, payment method, and shipping method for checkout', () => {
    expect(
      checkoutOrderSchema.parse({ addressId: '665f1a2b3c4d5e6f7a8b9c0d', paymentMethod: 'cod', shippingMethod: 'standard' }),
    ).toEqual({ addressId: '665f1a2b3c4d5e6f7a8b9c0d', paymentMethod: 'cod', shippingMethod: 'standard' });
  });

  it('rejects an unknown shipping method', () => {
    expect(() => checkoutOrderSchema.parse({
      addressId: '665f1a2b3c4d5e6f7a8b9c0d',
      paymentMethod: 'cod',
      shippingMethod: 'teleport',
    })).toThrow();
  });

  it('accepts pagination and an allowed admin status filter', () => {
    expect(listOrdersQuerySchema.parse({ page: '2', limit: '10', status: 'shipped' })).toEqual({ page: 2, limit: 10, status: 'shipped' });
  });
});
