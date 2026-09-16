/**
 * Hand-written OpenAPI 3.1 document for this API.
 *
 * There is no schema-generation tooling wired up (no swagger-jsdoc, no
 * zod-to-openapi) — this file is kept in sync with the route/schema files
 * by hand. When you add or change a route in `src/modules/**`, update the
 * matching path here too.
 *
 * Served as JSON at GET /openapi.json and rendered interactively at
 * GET /reference (see src/app.js).
 */

const sampleAddress = {
  _id: '665f1a2b3c4d5e6f7a8b9c0d',
  label: 'Home',
  line1: '99/9 Moo 4, Soi Ladprao 15',
  line2: 'Khwaeng Chomphon',
  city: 'Khet Chatuchak',
  state: 'Bangkok',
  postalCode: '10900',
  country: 'TH',
  isDefault: true,
};

const sampleUser = {
  _id: '665f1a2b3c4d5e6f7a8b9c0d',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 'customer',
  phone: '+66 81 234 5678',
  addresses: [sampleAddress],
  isActive: true,
  lastLoginAt: '2026-09-01T10:00:00.000Z',
  createdAt: '2026-08-30T09:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
};

const sampleAdmin = {
  ...sampleUser,
  _id: '665f1a2b3c4d5e6f7a8b9c0a',
  name: 'Grace Hopper',
  email: 'grace@example.com',
  role: 'admin',
};

const sampleProduct = {
  _id: '665f1a2b3c4d5e6f7a8b9c0e',
  name: 'Mechanical Keyboard',
  slug: 'mechanical-keyboard',
  description: 'A tactile 75% mechanical keyboard with hot-swappable switches.',
  category: 'electronics',
  optionNames: [],
  variants: [{ _id: '665f1a2b3c4d5e6f7a8b9c0f', sku: 'KEYBOARD-DEFAULT', options: {}, priceAmount: 89900, stock: 25, isActive: true }],
  images: ['https://example.com/keyboard.jpg'],
  isActive: true,
  createdAt: '2026-08-31T09:00:00.000Z',
  updatedAt: '2026-08-31T09:00:00.000Z',
};

const sampleOrder = {
  _id: '665f1a2b3c4d5e6f7a8b9c10',
  orderNumber: 'ORD-M1A2B3C4-D5E6F7',
  status: 'pending',
  currency: 'THB',
  paymentMethod: 'cod',
  shippingMethod: 'standard',
  subtotalAmount: 179800,
  taxAmount: 0,
  shippingAmount: 4000,
  totalAmount: 183800,
  items: [{
    productId: sampleProduct._id, variantId: sampleProduct.variants[0]._id, name: sampleProduct.name,
    slug: sampleProduct.slug, sku: sampleProduct.variants[0].sku, options: {}, unitPriceAmount: 89900, quantity: 2, lineTotalAmount: 179800,
  }],
  shippingAddress: sampleAddress,
  createdAt: '2026-09-01T10:00:00.000Z',
  updatedAt: '2026-09-01T10:00:00.000Z',
};

const sampleMeta = { page: 1, limit: 20, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false };
const sampleAccessToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2NjVmMW...';

const success = (data, meta) => ({ success: true, data, ...(meta ? { meta } : {}) });
const jsonResponse = (description, schema, value) => ({
  description,
  content: {
    'application/json': {
      schema,
      examples: { default: { value } },
    },
  },
});
const userEnvelopeSchema = {
  type: 'object',
  properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/User' } },
};
const productEnvelopeSchema = {
  type: 'object',
  properties: { success: { type: 'boolean' }, data: { $ref: '#/components/schemas/Product' } },
};
const errorResponse = (description, message = description, details) =>
  jsonResponse(description, { $ref: '#/components/schemas/ErrorResponse' }, { success: false, message, ...(details ? { details } : {}) });

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Express E-commerce API (MVP)',
    version: '0.1.0',
    description: `
A minimal e-commerce backend teaching core Express patterns: JWT auth,
RBAC, validation, pagination, and centralized error handling.

**Scope**: \`auth\`, \`users\`, \`products\`, \`cart\`, \`orders\` (pending → paid/
processing → shipped → delivered), \`payments\` (COD + Stripe Checkout), and
pluggable \`shipping\` cost calculation. Not a full storefront — no coupons,
reviews, or multi-provider payments.

**Response shape**: \`{ success: true, data, meta? }\`, or \`{ success: false,
message, details? }\` on error (see \`ErrorResponse\`). \`204\` responses have
no body.

**Trying it out**: requests here hit your real local server. Register, copy
the \`accessToken\`, then click **Authorize** to try authenticated endpoints.
The refresh cookie is set automatically.
    `.trim(),
  },
  servers: [{ url: '/', description: 'Same origin as this documentation page' }],
  tags: [
    { name: 'System', description: 'Server liveness checks' },
    { name: 'Auth', description: 'Registration, login, and session/token management' },
    { name: 'Users', description: 'The current user’s profile, addresses, and admin user management' },
    { name: 'Products', description: 'Product catalog: public browsing and admin management' },
    { name: 'Cart', description: 'Authenticated shopping-cart management' },
    { name: 'Orders', description: 'Checkout, order history, cancellation, and admin fulfillment' },
    { name: 'Payments', description: 'Stripe Checkout Session creation and webhook confirmation' },
    { name: 'Shipping', description: 'Available shipping methods' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Access token returned by /api/v1/auth/register or /api/v1/auth/login. Send it as `Authorization: Bearer <accessToken>`.',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          details: {
            type: 'array',
            nullable: true,
            items: {
              type: 'object',
              properties: {
                path: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Invalid email address' },
              },
            },
          },
        },
        required: ['success', 'message'],
      },
      PaginationMeta: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 3 },
          hasNextPage: { type: 'boolean', example: true },
          hasPrevPage: { type: 'boolean', example: false },
        },
      },
      Address: {
        type: 'object',
        description: 'Matches Stripe\'s generic address shape (line1/line2/city/state/postalCode/country). For TH: line1 = house/moo/soi/road, line2 = sub-district, city = district, state = province.',
        properties: {
          _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          label: { type: 'string', example: 'Home' },
          line1: { type: 'string', example: '99/9 Moo 4, Soi Ladprao 15' },
          line2: { type: 'string', nullable: true, example: 'Khwaeng Chomphon' },
          city: { type: 'string', example: 'Khet Chatuchak' },
          state: { type: 'string', nullable: true, example: 'Bangkok' },
          postalCode: { type: 'string', example: '10900' },
          country: { type: 'string', example: 'TH' },
          isDefault: { type: 'boolean', example: true },
        },
      },
      AddressInput: {
        type: 'object',
        required: ['line1', 'city', 'postalCode', 'country'],
        description: 'When country is "TH", state (province) is also required and postalCode must be 5 digits.',
        properties: {
          label: { type: 'string', example: 'Home' },
          line1: { type: 'string', example: '99/9 Moo 4, Soi Ladprao 15' },
          line2: { type: 'string', example: 'Khwaeng Chomphon' },
          city: { type: 'string', example: 'Khet Chatuchak' },
          state: { type: 'string', example: 'Bangkok' },
          postalCode: { type: 'string', example: '10900' },
          country: { type: 'string', example: 'TH' },
          isDefault: { type: 'boolean', example: true },
        },
      },
      User: {
        type: 'object',
        description: 'The password hash is never included in API responses.',
        properties: {
          _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
          name: { type: 'string', example: 'Ada Lovelace' },
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          role: { type: 'string', enum: ['customer', 'admin'], example: 'customer' },
          phone: { type: 'string', nullable: true, example: '+44 20 7946 0958' },
          addresses: { type: 'array', items: { $ref: '#/components/schemas/Address' } },
          isActive: { type: 'boolean', example: true },
          lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      RegisterInput: {
        type: 'object',
        required: ['name', 'email', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 100, example: 'Ada Lovelace' },
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          password: { type: 'string', minLength: 8, maxLength: 72, example: 'sup3rSecret!' },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          password: { type: 'string', example: 'sup3rSecret!' },
        },
      },
      ChangePasswordInput: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string', example: 'sup3rSecret!' },
          newPassword: { type: 'string', minLength: 8, maxLength: 72, example: 'evenSup3rerSecret!' },
        },
      },
      AuthResult: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data: {
            type: 'object',
            properties: {
              user: { $ref: '#/components/schemas/User' },
              accessToken: {
                type: 'string',
                description: 'Short-lived JWT (15m by default). Send as `Authorization: Bearer <token>`.',
                example: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI2NjVm...',
              },
            },
          },
        },
      },
      UserUpdateInput: {
        type: 'object',
        description: 'Fields a user may change on their own profile.',
        properties: {
          name: { type: 'string', example: 'Ada K. Lovelace' },
          phone: { type: 'string', example: '+44 20 7946 0958' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0e' },
          name: { type: 'string', example: 'Mechanical Keyboard' },
          slug: { type: 'string', example: 'mechanical-keyboard' },
          description: { type: 'string', example: 'A tactile 75% mechanical keyboard with hot-swappable switches.' },
          category: { type: 'string', example: 'electronics' },
          optionNames: { type: 'array', items: { type: 'string' }, example: ['Color', 'Size'] },
          variants: { type: 'array', items: { $ref: '#/components/schemas/ProductVariant' } },
          images: { type: 'array', items: { type: 'string', format: 'uri' }, example: ['https://example.com/kb.jpg'] },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ProductInput: {
        type: 'object',
        required: ['name', 'slug', 'optionNames', 'variants'],
        properties: {
          name: { type: 'string', maxLength: 200, example: 'Mechanical Keyboard' },
          slug: {
            type: 'string',
            pattern: '^[a-z0-9-]+$',
            description: 'Lowercase, kebab-case, must be unique.',
            example: 'mechanical-keyboard',
          },
          description: { type: 'string', maxLength: 2000, example: 'A tactile 75% mechanical keyboard.' },
          category: { type: 'string', maxLength: 100, example: 'electronics' },
          optionNames: { type: 'array', maxItems: 3, items: { type: 'string' }, example: ['Color', 'Size'] },
          variants: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/ProductVariantInput' } },
          images: { type: 'array', items: { type: 'string', format: 'uri' } },
        },
      },
      ProductUpdateInput: {
        type: 'object',
        description: 'All fields are optional. Update optionNames and variants together; include an existing variant `_id` to preserve cart references.',
        properties: {
          name: { type: 'string', maxLength: 200 },
          slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
          description: { type: 'string', maxLength: 2000 },
          category: { type: 'string', maxLength: 100 },
          images: { type: 'array', items: { type: 'string', format: 'uri' } },
          optionNames: { type: 'array', maxItems: 3, items: { type: 'string' } },
          variants: { type: 'array', minItems: 1, items: { $ref: '#/components/schemas/ProductVariantUpdateInput' } },
        },
      },
      ProductVariant: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          sku: { type: 'string', example: 'TSHIRT-BLACK-M' },
          options: { type: 'object', additionalProperties: { type: 'string' }, example: { Color: 'Black', Size: 'M' } },
          priceAmount: { type: 'integer', description: 'Price in satang', example: 49900 },
          stock: { type: 'integer', example: 25 },
          images: { type: 'array', items: { type: 'string', format: 'uri' } },
          isActive: { type: 'boolean', example: true },
        },
      },
      ProductVariantInput: {
        type: 'object', required: ['sku', 'options', 'priceAmount'],
        properties: {
          sku: { type: 'string', example: 'TSHIRT-BLACK-M' },
          options: { type: 'object', additionalProperties: { type: 'string' } },
          priceAmount: { type: 'integer', minimum: 0, example: 49900 },
          stock: { type: 'integer', minimum: 0, example: 25 },
          images: { type: 'array', items: { type: 'string', format: 'uri' } },
          isActive: { type: 'boolean' },
        },
      },
      ProductVariantUpdateInput: {
        allOf: [{ $ref: '#/components/schemas/ProductVariantInput' }],
        properties: { _id: { type: 'string', description: 'Existing variant id; retain it when updating an existing variant.' } },
      },
    },
  },
  paths: {
    '/api/v1/cart': {
      get: { tags: ['Cart'], summary: 'Get the current cart', security: [{ bearerAuth: [] }], responses: { 200: jsonResponse('Current cart.', { type: 'object' }, success({ items: [] })) } },
      delete: { tags: ['Cart'], summary: 'Clear the current cart', security: [{ bearerAuth: [] }], responses: { 204: { description: 'Cart cleared.' } } },
    },
    '/api/v1/cart/items': {
      post: {
        tags: ['Cart'], summary: 'Add an item to the cart', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['productId', 'variantId', 'quantity'], properties: { productId: { type: 'string' }, variantId: { type: 'string' }, quantity: { type: 'integer', minimum: 1, maximum: 100 } } } } } },
        responses: { 201: jsonResponse('Item added.', { type: 'object' }, success({ items: [] })), 409: errorResponse('Insufficient stock.', 'Requested quantity is not available') },
      },
    },
    '/api/v1/cart/items/{variantId}': {
      patch: {
        tags: ['Cart'], summary: 'Update cart item quantity', security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['quantity'], properties: { quantity: { type: 'integer', minimum: 1, maximum: 100 } } } } } },
        responses: { 200: jsonResponse('Cart updated.', { type: 'object' }, success({ items: [] })) },
      },
      delete: { tags: ['Cart'], summary: 'Remove a cart item', security: [{ bearerAuth: [] }], responses: { 200: jsonResponse('Cart updated.', { type: 'object' }, success({ items: [] })) } },
    },
    '/api/v1/orders': {
      post: {
        tags: ['Orders'],
        summary: 'Checkout cart',
        description: 'Requires authentication. Creates a `pending` order. For `paymentMethod: "stripe"`, call POST /payments/checkout-sessions next for the redirect URL.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object', required: ['addressId', 'paymentMethod', 'shippingMethod'],
                properties: {
                  addressId: { type: 'string', example: sampleAddress._id },
                  paymentMethod: { type: 'string', enum: ['cod', 'stripe'], example: 'cod' },
                  shippingMethod: { type: 'string', description: 'A key from GET /api/v1/shipping-methods.', example: 'standard' },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Pending order created.', { type: 'object' }, success(sampleOrder)),
          409: errorResponse('Cart is empty or stock is unavailable.', 'One or more products are unavailable'),
        },
      },
      get: {
        tags: ['Orders'],
        summary: 'List orders',
        description: 'Requires authentication. Customers see only their own orders; admins see all orders.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'expired'] } },
          { name: 'paymentMethod', in: 'query', schema: { type: 'string', enum: ['cod', 'stripe'] } },
        ],
        responses: { 200: jsonResponse('Orders.', { type: 'object' }, success([sampleOrder], sampleMeta)) },
      },
    },
    '/api/v1/orders/{id}': {
      get: { tags: ['Orders'], summary: 'Get order', description: 'Requires authentication. Customers can get their own orders; admins can get any order.', security: [{ bearerAuth: [] }], responses: { 200: jsonResponse('Order.', { type: 'object' }, success(sampleOrder)) } },
    },
    '/api/v1/orders/{id}/cancel': {
      post: {
        tags: ['Orders'],
        summary: 'Cancel order',
        description: 'Requires authentication. Customers can cancel their own orders; admins can cancel any order. Allowed while pending/paid/processing. Refunds via Stripe first if already paid (→ `refunded`), else → `cancelled`. Stock is always restored.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse('Order cancelled or refunded.', { type: 'object' }, success({ ...sampleOrder, status: 'cancelled' })),
          409: errorResponse('Order can no longer be cancelled.', 'Order can no longer be cancelled'),
        },
      },
    },
    '/api/v1/orders/{id}/confirm': {
      post: {
        tags: ['Orders'],
        summary: 'Confirm order',
        description: 'Requires admin access. COD orders confirm from `pending`; Stripe orders require `paid` first.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse('Order moved to processing.', { type: 'object' }, success({ ...sampleOrder, status: 'processing' })),
          403: errorResponse('The current user is not an admin.', 'You do not have permission to perform this action'),
          409: errorResponse('Order is not in a confirmable state.', 'Order cannot transition to processing'),
        },
      },
    },
    '/api/v1/orders/{id}/ship': {
      post: {
        tags: ['Orders'],
        summary: 'Mark order as shipped',
        description: 'Requires admin access.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['carrier', 'trackingNumber'], properties: { carrier: { type: 'string', example: 'Kerry Express' }, trackingNumber: { type: 'string', example: 'TH1234567890' } } },
            },
          },
        },
        responses: {
          200: jsonResponse('Order moved to shipped.', { type: 'object' }, success({ ...sampleOrder, status: 'shipped', carrier: 'Kerry Express', trackingNumber: 'TH1234567890' })),
          403: errorResponse('The current user is not an admin.', 'You do not have permission to perform this action'),
          409: errorResponse('Order is not in a shippable state.', 'Order cannot transition to shipped'),
        },
      },
    },
    '/api/v1/orders/{id}/deliver': {
      post: {
        tags: ['Orders'],
        summary: 'Mark order as delivered',
        description: 'Requires admin access. For COD orders, this is also when the order becomes paid — COD has no upfront payment gate.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse('Order moved to delivered.', { type: 'object' }, success({ ...sampleOrder, status: 'delivered' })),
          403: errorResponse('The current user is not an admin.', 'You do not have permission to perform this action'),
          409: errorResponse('Order is not in a deliverable state.', 'Order cannot transition to delivered'),
        },
      },
    },
    '/api/v1/orders/{id}/refund': {
      post: {
        tags: ['Orders'],
        summary: 'Refund order',
        description: 'Requires admin access. For a post-shipment return, beyond /cancel\'s scope. Refunds via Stripe if applicable.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse('Order refunded.', { type: 'object' }, success({ ...sampleOrder, status: 'refunded' })),
          403: errorResponse('The current user is not an admin.', 'You do not have permission to perform this action'),
          409: errorResponse('Order is not eligible for refund.', 'Order is not eligible for refund'),
        },
      },
    },
    '/api/v1/payments/checkout-sessions': {
      post: {
        tags: ['Payments'],
        summary: 'Create a Stripe Checkout Session for a pending Stripe-method order',
        description: 'Returns a hosted Checkout URL. The order is marked `paid` only once the webhook below confirms it.',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['orderId'], properties: { orderId: { type: 'string', example: sampleOrder._id } } } } } },
        responses: {
          201: jsonResponse('Checkout session created.', { type: 'object' }, success({ url: 'https://checkout.stripe.com/c/pay/cs_test_...', sessionId: 'cs_test_...' })),
          409: errorResponse('Order is not awaiting payment.', 'Order is not awaiting payment'),
        },
      },
    },
    '/api/v1/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Process Stripe webhook',
        description:
          'Called by Stripe, not API clients. Verifies `Stripe-Signature` against STRIPE_WEBHOOK_SECRET; needs the raw body, so it can\'t be tried from this page. ' +
          'Idempotent per event id — marks the order `paid` on success, `cancelled` (stock restored) on expiry/failure.',
        security: [],
        parameters: [{ name: 'Stripe-Signature', in: 'header', required: true, schema: { type: 'string' } }],
        responses: {
          200: jsonResponse('Event processed (or already-processed events acknowledged as a no-op).', { type: 'object' }, { received: true }),
          400: errorResponse('Missing/invalid signature, or Stripe is not configured.', 'Invalid Stripe webhook signature'),
        },
      },
    },
    '/api/v1/shipping-methods': {
      get: {
        tags: ['Shipping'],
        summary: 'List available shipping methods',
        description: 'Use a returned `key` as checkout\'s `shippingMethod`.',
        security: [],
        responses: {
          200: jsonResponse('Shipping methods.', { type: 'object' }, success([{ key: 'standard', label: 'Standard Shipping' }, { key: 'express', label: 'Express Shipping' }])),
        },
      },
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Liveness probe. Does not touch the database.',
        security: [],
        responses: {
          200: {
            description: 'The server is up.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { success: { type: 'boolean', example: true }, message: { type: 'string', example: 'ok' } },
                },
                examples: { default: { value: { success: true, message: 'ok' } } },
              },
            },
          },
        },
      },
    },
    '/api/v1/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Create an account',
        description: 'Creates a `customer` user, and returns an access token plus sets a refresh token cookie.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterInput' },
              examples: {
                default: { summary: 'New customer', value: { name: 'Ada Lovelace', email: 'ada@example.com', password: 'sup3rSecret!' } },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Account created.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResult' },
                examples: { default: { value: success({ user: sampleUser, accessToken: sampleAccessToken }) } },
              },
            },
          },
          409: errorResponse('Email is already in use.', 'Email already in use'),
          422: errorResponse('Validation failed (e.g. password too short, invalid email).', 'Validation failed', [
            { path: 'email', message: 'Invalid email address' },
          ]),
        },
      },
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in',
        description: 'Verifies credentials and returns an access token plus sets a refresh token cookie.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' },
              examples: {
                default: { summary: 'Existing customer', value: { email: 'ada@example.com', password: 'sup3rSecret!' } },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Logged in.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AuthResult' },
                examples: { default: { value: success({ user: sampleUser, accessToken: sampleAccessToken }) } },
              },
            },
          },
          401: errorResponse('Invalid email or password.'),
        },
      },
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh the access token',
        description: 'Reads the `refreshToken` httpOnly cookie, issues a new access token, and rotates the cookie. No request body needed.',
        security: [],
        responses: {
          200: {
            description: 'New access token issued.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object', properties: { accessToken: { type: 'string' } } },
                  },
                },
                examples: { default: { value: success({ accessToken: sampleAccessToken }) } },
              },
            },
          },
          401: errorResponse('Refresh token missing, invalid, or expired — the user must log in again.', 'Invalid or expired refresh token'),
        },
      },
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Log out',
        description: 'Clears the refresh token cookie. The current access token remains valid until it expires.',
        security: [],
        responses: { 204: { description: 'Logged out.' } },
      },
    },
    '/api/v1/auth/change-password': {
      post: {
        tags: ['Auth'],
        summary: 'Change the current user’s password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChangePasswordInput' },
              examples: { default: { value: { currentPassword: 'sup3rSecret!', newPassword: 'evenSup3rerSecret!' } } },
            },
          },
        },
        responses: {
          204: { description: 'Password changed.' },
          401: errorResponse('Missing/invalid access token, or currentPassword is wrong.', 'Current password is incorrect'),
        },
      },
    },
    '/api/v1/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get my profile',
        description: 'Requires authentication.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: jsonResponse('The current user.', userEnvelopeSchema, success(sampleUser)),
          401: errorResponse('Missing or invalid access token.', 'Authentication token missing'),
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update my profile',
        description: 'Requires authentication. Only `name` and `phone` may be changed here — `password` and `role` are ignored even if sent.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UserUpdateInput' },
              examples: { default: { value: { name: 'Ada K. Lovelace', phone: '+44 20 7946 0958' } } },
            },
          },
        },
        responses: {
          200: jsonResponse('Updated user.', userEnvelopeSchema, success({ ...sampleUser, name: 'Ada K. Lovelace' })),
          401: errorResponse('Missing or invalid access token.', 'Authentication token missing'),
        },
      },
    },
    '/api/v1/users/sudlor': {
      get: {
        tags: ['Users'],
        summary: 'Get Sudlor GitHub profile',
        description: 'Returns a public profile snapshot for GitHub user KantaKan. Authentication is not required.',
        security: [],
        responses: {
          200: jsonResponse(
            'Public GitHub profile snapshot.',
            {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    login: { type: 'string', example: 'KantaKan' },
                    id: { type: 'integer', example: 140788074 },
                    avatarUrl: { type: 'string', format: 'uri' },
                    profileUrl: { type: 'string', format: 'uri' },
                    publicRepos: { type: 'integer', example: 95 },
                    followers: { type: 'integer', example: 32 },
                    following: { type: 'integer', example: 7 },
                  },
                },
              },
            },
            success({
              login: 'KantaKan',
              id: 140788074,
              avatarUrl: 'https://avatars.githubusercontent.com/u/140788074?v=4',
              profileUrl: 'https://github.com/KantaKan',
              publicRepos: 95,
              followers: 32,
              following: 7,
            }),
          ),
        },
      },
    },
    '/api/v1/users/me/addresses': {
      post: {
        tags: ['Users'],
        summary: 'Add my address',
        description: 'Requires authentication.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AddressInput' },
              examples: {
                default: {
                  value: {
                    label: 'Home',
                    line1: '99/9 Moo 4, Soi Ladprao 15',
                    line2: 'Khwaeng Chomphon',
                    city: 'Khet Chatuchak',
                    state: 'Bangkok',
                    postalCode: '10900',
                    country: 'TH',
                    isDefault: true,
                  },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Address added; returns the updated user.', userEnvelopeSchema, success(sampleUser)),
          401: errorResponse('Missing or invalid access token.', 'Authentication token missing'),
        },
      },
    },
    '/api/v1/users/me/addresses/{addressId}': {
      delete: {
        tags: ['Users'],
        summary: 'Remove my address',
        description: 'Requires authentication.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'addressId', in: 'path', required: true, schema: { type: 'string' }, example: '665f1a2b3c4d5e6f7a8b9c0d' }],
        responses: {
          200: jsonResponse('Address removed; returns the updated user.', userEnvelopeSchema, success({ ...sampleUser, addresses: [] })),
          401: errorResponse('Missing or invalid access token.', 'Authentication token missing'),
          404: errorResponse('Address not found on this user.', 'Address not found'),
        },
      },
    },
    '/api/v1/users': {
      get: {
        tags: ['Users'],
        summary: 'List users',
        description: 'Requires admin access.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, example: 1 },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, example: 20 },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['customer', 'admin'] }, example: 'customer' },
          { name: 'search', in: 'query', description: 'Case-insensitive match against name or email.', schema: { type: 'string' }, example: 'ada' },
        ],
        responses: {
          200: {
            description: 'Paginated list of users.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
                examples: { default: { value: success([sampleUser, sampleAdmin], { ...sampleMeta, total: 2 }) } },
              },
            },
          },
          401: errorResponse('Missing or invalid access token.', 'Authentication token missing'),
          403: errorResponse('The current user is not an admin.', 'You do not have permission to perform this action'),
        },
      },
    },
    '/api/v1/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get user by ID',
        description: 'Requires admin access.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: sampleUser._id }],
        responses: {
          200: jsonResponse('The requested user.', userEnvelopeSchema, success(sampleUser)),
          401: errorResponse('Missing or invalid access token.', 'Authentication token missing'),
          403: errorResponse('The current user is not an admin.', 'You do not have permission to perform this action'),
          404: errorResponse('User not found.'),
        },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update user',
        description: 'Requires admin access. Unlike PATCH /api/v1/users/me, an admin may also set `role` and `isActive` here.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: sampleUser._id }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  phone: { type: 'string' },
                  role: { type: 'string', enum: ['customer', 'admin'] },
                  isActive: { type: 'boolean' },
                },
              },
              examples: { promoteToAdmin: { summary: 'Promote to admin', value: { role: 'admin' } } },
            },
          },
        },
        responses: {
          200: jsonResponse('Updated user.', userEnvelopeSchema, success({ ...sampleUser, role: 'admin' })),
          401: errorResponse('Missing or invalid access token.', 'Authentication token missing'),
          403: errorResponse('The current user is not an admin.', 'You do not have permission to perform this action'),
          404: errorResponse('User not found.'),
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete user',
        description: 'Requires admin access.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: sampleUser._id }],
        responses: {
          204: { description: 'User deleted.' },
          401: errorResponse('Missing or invalid access token.', 'Authentication token missing'),
          403: errorResponse('The current user is not an admin.', 'You do not have permission to perform this action'),
          404: errorResponse('User not found.'),
        },
      },
    },
    '/api/v1/products': {
      get: {
        tags: ['Products'],
        summary: 'List active products',
        description: 'No authentication required.',
        security: [],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 }, example: 1 },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 }, example: 20 },
          { name: 'category', in: 'query', schema: { type: 'string' }, example: 'electronics' },
          { name: 'search', in: 'query', description: 'Case-insensitive match against product name.', schema: { type: 'string' }, example: 'keyboard' },
        ],
        responses: {
          200: {
            description: 'Paginated list of products.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Product' } },
                    meta: { $ref: '#/components/schemas/PaginationMeta' },
                  },
                },
                examples: { default: { value: success([sampleProduct], sampleMeta) } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Products'],
        summary: 'Create product',
        description: 'Requires admin access.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductInput' },
              examples: {
                default: {
                  value: {
                    name: 'Mechanical Keyboard',
                    slug: 'mechanical-keyboard',
                    description: 'A tactile 75% mechanical keyboard with hot-swappable switches.',
                    category: 'electronics',
                    optionNames: [],
                    variants: [{ sku: 'KEYBOARD-DEFAULT', options: {}, priceAmount: 89900, stock: 25 }],
                    images: ['https://example.com/keyboard.jpg'],
                  },
                },
              },
            },
          },
        },
        responses: {
          201: jsonResponse('Product created.', productEnvelopeSchema, success(sampleProduct)),
          401: errorResponse('Missing or invalid access token.', 'Authentication token missing'),
          403: errorResponse('The current user is not an admin.', 'You do not have permission to perform this action'),
          409: errorResponse('A product with this slug already exists.', 'Duplicate value for field: slug'),
          422: errorResponse('Validation failed.', 'Validation failed', [{ path: 'variants.0.sku', message: 'SKU is required' }]),
        },
      },
    },
    '/api/v1/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product by ID',
        description: 'No authentication required.',
        security: [],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: sampleProduct._id }],
        responses: {
          200: jsonResponse('The requested product.', productEnvelopeSchema, success(sampleProduct)),
          404: errorResponse('Product not found.'),
        },
      },
      patch: {
        tags: ['Products'],
        summary: 'Update product',
        description: 'Requires admin access.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: sampleProduct._id }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductUpdateInput' },
              examples: { restock: { summary: 'Restock and reprice', value: { optionNames: [], variants: [{ sku: 'KEYBOARD-DEFAULT', options: {}, stock: 100, priceAmount: 7900 }] } } },
            },
          },
        },
        responses: {
          200: jsonResponse('Updated product.', productEnvelopeSchema, success({ ...sampleProduct, variants: [{ ...sampleProduct.variants[0], priceAmount: 7900, stock: 100 }] })),
          401: errorResponse('Missing or invalid access token.', 'Authentication token missing'),
          403: errorResponse('The current user is not an admin.', 'You do not have permission to perform this action'),
          404: errorResponse('Product not found.'),
        },
      },
      delete: {
        tags: ['Products'],
        summary: 'Archive product',
        description: 'Requires admin access.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' }, example: sampleProduct._id }],
        responses: {
          204: { description: 'Product archived.' },
          401: errorResponse('Missing or invalid access token.', 'Authentication token missing'),
          403: errorResponse('The current user is not an admin.', 'You do not have permission to perform this action'),
          404: errorResponse('Product not found.'),
        },
      },
    },
    '/api/v1/products/admin': {
      get: {
        tags: ['Products'], summary: 'List all products', description: 'Requires admin access. Includes archived products.', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'archived', 'all'], default: 'all' } }],
        responses: { 200: jsonResponse('Admin product list.', { type: 'object' }, success([sampleProduct], sampleMeta)) },
      },
    },
    '/api/v1/products/admin/{id}': {
      get: {
        tags: ['Products'], summary: 'Get any product', description: 'Requires admin access. Includes archived products.', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: jsonResponse('Product.', productEnvelopeSchema, success(sampleProduct)) },
      },
    },
    '/api/v1/products/{id}/restore': {
      post: {
        tags: ['Products'], summary: 'Restore archived product', description: 'Requires admin access.', security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: jsonResponse('Product restored.', productEnvelopeSchema, success(sampleProduct)) },
      },
    },
  },
};
