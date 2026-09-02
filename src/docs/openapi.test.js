import { describe, expect, it } from 'vitest';
import { openApiDocument } from './openapi.js';

describe('openApiDocument', () => {
  it('uses root-relative paths that match the Express mount points', () => {
    expect(openApiDocument.servers).toEqual([{ url: '/', description: 'Same origin as this documentation page' }]);
    expect(openApiDocument.paths).toHaveProperty('/health');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/auth/register');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/users/me');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/products');
  });

  it('documents cart and order checkout endpoints', () => {
    expect(openApiDocument.paths).toHaveProperty('/api/v1/cart');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/cart/items');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/orders');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/orders/{id}');
  });

  it('documents variant product management and restoration', () => {
    expect(openApiDocument.paths).toHaveProperty('/api/v1/products/admin');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/products/admin/{id}');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/products/{id}/restore');
  });

  it('documents order fulfillment, payments, and shipping methods', () => {
    expect(openApiDocument.paths).toHaveProperty('/api/v1/orders/{id}/confirm');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/orders/{id}/ship');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/orders/{id}/deliver');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/orders/{id}/refund');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/payments/checkout-sessions');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/payments/webhook');
    expect(openApiDocument.paths).toHaveProperty('/api/v1/shipping-methods');
    expect(openApiDocument.tags.map((tag) => tag.name)).toEqual(expect.arrayContaining(['Payments', 'Shipping']));
  });

  it('uses action-focused summaries and describes access requirements separately', () => {
    const operations = Object.values(openApiDocument.paths)
      .flatMap((pathItem) => Object.values(pathItem))
      .filter((operation) => operation?.summary);

    expect(operations.map((operation) => operation.summary)).not.toEqual(expect.arrayContaining([
      expect.stringMatching(/^(admin|customer|public) - /),
    ]));
    expect(openApiDocument.paths['/api/v1/orders/{id}/confirm'].post).toMatchObject({
      summary: 'Confirm order',
      description: expect.stringContaining('Requires admin access.'),
    });
  });
});
