# E-commerce Backend Backlog

> Updated: 2026-09-01
>
> Current scope: the API provides authentication, user profiles/addresses, and a basic product catalog. It is not yet able to complete a purchase.

## Current baseline

- Authentication: register, login, access-token refresh, logout, and password change.
- Users: self-service profile/address management and admin user management.
- Products: public listing/detail endpoints and admin CRUD.
- Platform: request validation, role-based authorization, rate limits, OpenAPI docs, and basic test coverage.

## P0 — Required to accept real orders

### Cart

- [x] Create a cart model and endpoints to view, add, update quantity, remove item, and clear cart.
- [x] Validate product availability, active state, and quantity when mutating the cart.
- [x] Decide and implement guest-cart behavior: v1 requires login and has no guest cart.

### Orders and checkout

- [x] Create order, order-item, and shipping-address snapshots.
- [x] Create checkout that builds an order from the cart.
- [x] Persist immutable item snapshots: product id, name/slug, unit price, quantity, and zero tax/shipping amounts.
- [ ] Define and enforce an order state machine: `pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`.
- [ ] Let customers list/detail only their orders; let admins list, detail, and update fulfillment status.
- [x] Use MongoDB transactions and atomic inventory updates to prevent overselling.
- [ ] Define cancellation, refund, and stock-restoration rules.

### Payments

- [ ] Select a payment provider appropriate for the target market.
- [ ] Create payment initiation / payment-intent flow.
- [ ] Verify payment-provider webhooks with signature validation.
- [ ] Make webhook handling idempotent and retain an event-processing audit trail.
- [ ] Mark an order as paid only after verified server-side payment confirmation.

### Shipping and fulfillment

- [ ] Support a selected shipping address and shipping method during checkout.
- [ ] Calculate and persist shipping cost.
- [ ] Add carrier, tracking number, shipped/delivered timestamps, and fulfillment updates.

## P1 — Product and customer experience

### Product catalog

- [x] Add SKU per product variant.
- [ ] Add barcode, currency, sale price, tax attributes, weight, and dimensions.
- [x] Add variants (for example color/size), each with its own SKU, price, stock, and images.
- [ ] Make categories and brands dedicated resources instead of free-text fields.
- [ ] Add public filtering/sorting: category, price range, availability, newest, and relevance.
- [x] Support product archive/restore and an admin view of inactive products instead of hard deletion only.
- [ ] Add image upload/storage integration and CDN delivery.

### Promotions and customer features

- [ ] Add coupons with validity period, minimum spend, usage limits, and per-user restrictions.
- [ ] Calculate discounts exclusively on the server.
- [ ] Add wishlist endpoints.
- [ ] Add product ratings/reviews, moderation policy, and optionally verified-purchase checks.
- [ ] Generate invoices/receipts and provide order history.

## P1 — Authentication and administration

### Account security

- [ ] Implement forgot-password and reset-password flows.
- [ ] Implement email verification.
- [ ] Let users view and revoke active sessions/devices.
- [ ] Consider OAuth and two-factor authentication if required by the product.

### Administration

- [ ] Add inventory-adjustment operations with reason and audit history.
- [ ] Add low-stock reporting and notifications.
- [ ] Add sales/order dashboard metrics and export endpoints.
- [ ] Add finer-grained roles/permissions if `admin` and `customer` become insufficient.
- [ ] Record audit logs for sensitive admin actions.

## P2 — Production readiness

### Reliability and operations

- [ ] Add a readiness endpoint that verifies MongoDB connectivity; retain `/health` as a liveness check.
- [ ] Configure graceful shutdown and connection draining.
- [ ] Use Redis or another shared store for rate limiting when running more than one API instance.
- [ ] Add a job queue for email delivery, webhook retries, invoices, and notifications.
- [ ] Add caching for frequently-read catalog data where measurements justify it.
- [ ] Configure structured monitoring, error tracking, alerts, database backups, and recovery procedures.
- [ ] Define database migrations, seed data, and environment-specific deployment configuration.

### API quality and tests

- [ ] Add integration tests for authentication, authorization, user management, product CRUD, and validation failures.
- [ ] Add end-to-end tests for cart, checkout, inventory race conditions, payment webhooks, refunds, and coupons.
- [ ] Add contract tests to keep OpenAPI documentation aligned with actual routes.
- [ ] Add CI to run tests and dependency/security checks on every change.

## Suggested delivery order

1. Cart
2. Orders, checkout, and atomic stock reservation/deduction
3. Payment-provider integration and verified webhooks
4. Shipping and fulfillment
5. Product variants and promotions
6. Operations, observability, and broader automated testing
