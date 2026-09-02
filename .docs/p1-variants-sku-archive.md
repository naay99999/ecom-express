# P1: Product Variants, SKU, and Archive

## Overview

Products now use variants as their sellable inventory units. A product always has at least one variant, including products without customer-facing options.

## Product format

Each product has:

- `optionNames`: zero to three option names, such as `Color`, `Size`, or `Capacity`.
- `variants`: one or more variants, each with an id, unique SKU, option values, price in satang, stock, image URLs, and active state.
- `isActive` and `archivedAt`: product archive state.

For a product without choices, use one default variant:

```json
{
  "name": "Mechanical Keyboard",
  "slug": "mechanical-keyboard",
  "optionNames": [],
  "variants": [
    {
      "sku": "KEYBOARD-DEFAULT",
      "options": {},
      "priceAmount": 89900,
      "stock": 25
    }
  ]
}
```

`priceAmount` is always an integer in satang. SKU must be globally unique. A variant's `options` keys must exactly match the parent product's `optionNames`, and duplicate option combinations are rejected.

When updating an existing variant, include its `_id` in the request. This keeps existing cart references valid. To stop selling a specific variant, set its `isActive` value to `false` rather than removing it.

## API changes

- `POST /api/v1/products` requires `optionNames` and `variants`; product-level `priceAmount` and `stock` are no longer accepted.
- `PATCH /api/v1/products/:id` accepts partial product data. Update `optionNames` and `variants` together.
- `POST /api/v1/cart/items` now requires `productId`, `variantId`, and `quantity`.
- `PATCH` and `DELETE /api/v1/cart/items/:variantId` identify cart items by variant id.
- `DELETE /api/v1/products/:id` archives a product; it does not delete it permanently.
- `POST /api/v1/products/:id/restore` restores an archived product.
- Admin catalog endpoints:
  - `GET /api/v1/products/admin?status=active|archived|all`
  - `GET /api/v1/products/admin/:id`

Public catalog, cart updates, and checkout reject archived products or inactive variants. Existing orders remain readable because they store product and variant snapshots.

## Migration

Before deploying this change to a database with existing products or carts, run:

```bash
npm run migrate:product-variants
```

The migration creates a default variant for each legacy product, uses a `LEGACY-<product-id>` SKU, moves its prior price/stock to that variant, and updates legacy cart items with the new `variantId`.

Run it only after MongoDB is configured as a replica set; see [MongoDB replica set setup](mongodb-replica-set.md).
