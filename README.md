# Express E-commerce API

Example e-commerce backend for learning Express patterns: JWT authentication,
role-based access control, validation with Zod, MongoDB transactions,
pagination, Stripe Checkout, and centralized error handling.

## Prerequisites

- Node.js 20.6 or later
- npm
- MongoDB 7 or later, running as a replica set. Checkout creates orders in a
  transaction, so a standalone MongoDB server will not work.

## Quick start

Clone the repository and install the locked dependency versions:

```bash
git clone <repository-url>
cd express
npm ci
```

Create your local configuration file:

```bash
cp .env.example .env
```

Generate secrets, then replace `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and
`COOKIE_SECRET` in `.env`. The two JWT secrets must be different and at least
32 characters long.

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 24
```

### Start MongoDB as a local replica set

If MongoDB is installed locally, start a single-node replica set in one
terminal. Choose any writable directory for `--dbpath`.

```bash
mongod --replSet rs0 --dbpath ./data/mongodb
```

In a second terminal, initialize it once:

```bash
mongosh --eval 'rs.initiate()'
```

Set this value in `.env` so the driver connects to that replica set:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/express_ecommerce?replicaSet=rs0
```

> If you use MongoDB Atlas, create a replica-set deployment and use its
> connection string for `MONGO_URI` instead.

### Run the API

```bash
npm run dev
```

The API starts at `http://localhost:4000` by default. Confirm it is running:

```bash
curl http://localhost:4000/health
```

Open the interactive API documentation at
`http://localhost:4000/reference`. The raw OpenAPI document is available at
`http://localhost:4000/openapi.json`, and a short [llms.txt](https://llmstxt.org)
pointer for AI agents calling the API directly is served at
`http://localhost:4000/llms.txt`.

## Demo data

Seed a local development database with an admin, a customer, products, and a
customer cart:

```bash
npm run db:seed
```

The seed script is not idempotent. To erase all app data from the configured
development database and seed it again:

```bash
npm run db:reset
```

`db:clear` and `db:reset` permanently delete app data. Do not run them against
a database that contains data you need.

The seed command prints the demo email addresses and passwords in the terminal.
Use them only for local development.

## Stripe (optional)

The API works without Stripe when you use cash on delivery (`cod`). To test
Stripe Checkout, add these values to `.env`:

```dotenv
STRIPE_SECRET_KEY=rk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CHECKOUT_SUCCESS_URL=http://localhost:3000/checkout/success
STRIPE_CHECKOUT_CANCEL_URL=http://localhost:3000/checkout/cancel
```

For `STRIPE_SECRET_KEY`, create a
[restricted key](https://docs.stripe.com/keys/restricted-api-keys) (Dashboard
→ Developers → API keys → **Create restricted key**) rather than using the
full secret key — this app only ever calls `checkout.sessions.create`, so
scope the key to **Checkout Sessions: Write** and leave every other resource
at **None**.

### Local webhook forwarding

Use the Stripe CLI to forward webhook events to your local server instead of
registering a real endpoint:

```bash
stripe listen --forward-to localhost:4000/api/v1/payments/webhook
```

Copy the webhook signing secret printed by the CLI into `STRIPE_WEBHOOK_SECRET`
and restart the API so it picks up the new value.

### Webhook endpoint for a deployed instance

`stripe listen` only forwards to `localhost`. Once the API is reachable on a
public URL (e.g. deployed per `render.yaml`), register a real webhook
endpoint instead:

1. Dashboard → Developers → Webhooks → **Add endpoint**, in the same mode
   (test/live) as the API key you're using.
2. Endpoint URL: `https://<your-domain>/api/v1/payments/webhook`.
3. Subscribe to exactly the events `payment.service.js` handles:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.expired`, `checkout.session.async_payment_failed`.
4. Copy that endpoint's **Signing secret** into the deployment's
   `STRIPE_WEBHOOK_SECRET` — it's different from the CLI's local secret and
   from any other endpoint's secret.

Each `stripe listen` run and each Dashboard endpoint has its own signing
secret; a local `.env` secret will fail signature verification against a
deployed endpoint's events and vice versa.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API with automatic reloads. |
| `npm start` | Start the API once. |
| `npm test` | Run the test suite once. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run db:seed` | Insert local demo data. |
| `npm run db:clear` | Permanently delete all app data in the configured database. |
| `npm run db:reset` | Clear the configured database, then insert demo data. |

## Project structure

```text
src/
├── app.js                 # Express app, global middleware, and routes
├── server.js              # Database connection and HTTP server startup
├── config/                # Environment, database, logging, and Stripe setup
├── docs/openapi.js        # Hand-written OpenAPI document
├── middleware/            # Shared Express middleware
├── modules/<feature>/     # Routes, controllers, services, models, schemas
└── utils/                 # Reusable helpers
```

Keep secrets in `.env`; it is ignored by Git. Use `.env.example` as the safe
template when adding or documenting configuration.
