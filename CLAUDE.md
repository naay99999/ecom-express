# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A minimal Express backend teaching example (auth + users + products only — intentionally not a full
e-commerce build). It demonstrates one consistent pattern for a module (route → controller → service →
model/schema) that's meant to be replicated for new resources, not a complete storefront.

## Commands

```bash
npm ci                  # or npm install
cp .env.example .env    # then fill in MONGO_URI and JWT secrets (min 32 chars each)
npm run dev              # nodemon, loads .env via node --env-file
npm start                # production entrypoint, same env loading
npm test                 # vitest run (no test files exist yet)
npm run test:watch       # vitest in watch mode
```

There is no lint/format config in this repo — two-space indent, single quotes, semicolons, and
trailing commas in multiline structures are the existing convention; match it by hand.
`camelCase` for variables/functions, `PascalCase` for models and error classes.

No test directory exists yet. When adding tests, either co-locate them with the feature
(`src/modules/products/product.service.test.js`) or mirror `src/` under a top-level `tests/`
if a larger suite is introduced — Vitest picks up `*.test.js`/`*.spec.js` either way.

Requires a MongoDB instance reachable at `MONGO_URI`; `src/server.js` awaits `connectDatabase()` before
`app.listen`, so the process will hang/fail to boot without one. `src/app.js` itself (routing, validation,
error handling) has no DB dependency and can be exercised directly with `supertest` for anything that
doesn't touch a model.

## Architecture

**ESM throughout — this is load-bearing, not stylistic.** `package.json` has `"type": "module"` because
`jose` (JWT signing/verification) ships ESM-only with no CommonJS build. Do not introduce `require()` or
switch any file back to CJS; it will break at import time.

**Dependencies are pinned to unusually new majors — don't assume v4/v8-era APIs.** This repo runs
Express 5 and Mongoose 9, both of which changed callback conventions from what's in most tutorials/LLM
training data:
- Express 5 makes `req.query` a getter with no setter — `req.query = x` throws `TypeError`. See the
  work-around in `middleware/validate.middleware.js` (`Object.defineProperty`) before writing anything
  else that reassigns `req.query`.
- Mongoose 9 dropped legacy callback-style (`fn(next)`) schema middleware entirely — `pre`/`post` hooks
  must be plain `async function()`s (throw to reject, return to proceed). See `modules/users/user.model.js`
  for the working pattern; a hook written with a `next` parameter will fail at runtime with `next is not
  a function`, not at lint/import time.

**Module layout** (`src/modules/<name>/`): each resource follows
`<name>.route.js` → `<name>.controller.js` → `<name>.service.js`, plus `<name>.model.js` (mongoose schema)
and `<name>.schema.js` (zod input schemas) where relevant. Routes wire `validate(schema)` +
`authenticate`/`authorize(...roles)` middleware before controllers; controllers stay thin (parse
req → call service → shape response) and always `catch` into `next(err)`; services hold the actual
DB/business logic and throw `utils/errors.js` classes (`NotFoundError`, `ConflictError`, etc.) rather than
touching `res` directly. Follow this same shape when adding a new module.

**Error handling**: `middleware/error.middleware.js` is the single place that turns exceptions into HTTP
responses. It translates `ZodError`, mongoose `CastError`/`ValidationError`, and duplicate-key (11000)
errors into the app's `AppError` shape, then responds with `{ success: false, message, details? }`.
Non-operational (unexpected) errors are logged via pino and never leak internals to the client outside
`NODE_ENV=development`. When a service needs to fail with a specific status, throw one of the
`AppError` subclasses from `utils/errors.js` instead of building a response inline.

**Auth**: `modules/auth` issues a short-lived access token (returned in the JSON body, also accepted via
`Authorization: Bearer` header) and a long-lived refresh token (set as an `httpOnly` cookie scoped to
`/api/v1/auth`, used by `POST /auth/refresh`). Both are signed with `jose` (`SignJWT`/`jwtVerify`), not
`jsonwebtoken`. `middleware/auth.middleware.js` exports `authenticate` (required) and `authorize(...roles)`
(role gate, must run after `authenticate`) — `req.user = { id, role, email }` once authenticated.

**Config/env**: `config/env.js` validates `process.env` with a zod schema at import time and calls
`process.exit(1)` on failure — this is the only place env vars should be read from; other modules import
`env` from here rather than touching `process.env` directly. `config/database.js` and `config/logger.js`
(pino, pretty-printed only in development) follow the same "single source" pattern. When you add a
required env var, update both the zod schema and `.env.example` — the app won't boot without both in sync.

**Pagination**: list endpoints use `utils/pagination.js` (`parsePagination(query)` → `paginate(Model,
filter, pagination)`), which returns `{ data, meta }` with `page/limit/total/totalPages/hasNextPage/hasPrevPage`.
Reuse this instead of hand-rolling skip/limit math in a new service.

**Routing mount points**: `src/app.js` mounts modules at `/api/v1/<module>` and applies `helmet`, `cors`,
`cookie-parser`, `pino-http` request logging, and a global `apiLimiter` rate limiter (under `/api`) before
them; `authLimiter` (stricter) is applied per-route in `auth.route.js` for `/register` and `/login` only.

**API docs**: `src/docs/openapi.js` is a hand-written OpenAPI 3.1 document — there's no swagger-jsdoc/
zod-to-openapi generation, so update it by hand alongside any route/schema change. It's served as JSON at
`GET /openapi.json` and rendered interactively (Scalar, try-it-out included) at `GET /reference`, both
mounted in `app.js`. Scalar's page loads its UI bundle from `cdn.jsdelivr.net` and runs an inline init
script, so the global helmet CSP's `script-src` explicitly allows that CDN + `'unsafe-inline'` — don't
tighten `script-src` back to `'self'` without accounting for that.
