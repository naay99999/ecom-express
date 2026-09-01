# Repository Guidelines

## Project Structure & Module Organization

Application code lives in `src/`. `src/app.js` configures Express, global middleware, and API routes; `src/server.js` connects to MongoDB and starts the HTTP server. Feature code is grouped under `src/modules/<feature>/` using `*.route.js`, `*.controller.js`, `*.service.js`, `*.model.js`, and `*.schema.js` files. Shared middleware belongs in `src/middleware/`, runtime configuration in `src/config/`, and reusable helpers in `src/utils/`.

No test directory or static asset directory currently exists. Keep new tests close to their feature (for example, `src/modules/products/product.service.test.js`) or mirror the source layout under `tests/` if a larger suite is introduced.

## Build, Test, and Development Commands

- `npm ci`: install the exact dependency versions recorded in `package-lock.json`.
- `cp .env.example .env`: create local configuration; update secrets before running outside local development.
- `npm run dev`: start the API with Nodemon and reload on file changes.
- `npm start`: run the server once using Node's `.env` file support.
- `npm test`: execute the Vitest suite once.
- `npm run test:watch`: run Vitest interactively while developing.

There is no compilation step; the project runs as native Node.js ES modules and requires Node 20.6 or newer.

## Coding Style & Naming Conventions

Use ES module `import`/`export`, two-space indentation, single quotes, semicolons, and trailing commas in multiline structures. Use `camelCase` for variables and functions, `PascalCase` for models and error classes, and descriptive feature filenames such as `auth.controller.js`. Keep controllers focused on HTTP concerns, services on business logic, and schemas on validation. No formatter or lint command is configured, so match surrounding code carefully.

## Testing Guidelines

Use Vitest for unit and integration tests and Supertest for HTTP endpoints. Name tests `*.test.js` or `*.spec.js`, cover success and failure paths, and isolate database state. No coverage threshold is configured; add regression tests for every bug fix and tests for new routes, validation, and authorization behavior.

## Commit & Pull Request Guidelines

Git history is unavailable in this checkout, so no repository-specific commit convention can be confirmed. Use concise, imperative subjects such as `Add product validation tests`, and keep each commit focused. Pull requests should explain the behavior change, list verification commands, link relevant issues, and document API or environment changes. Include request/response examples when endpoint behavior changes.

## Security & Configuration

Never commit `.env` or real credentials. Keep `.env.example` current when adding configuration. Validate all external input with Zod, preserve authentication and rate-limiting middleware, and avoid logging tokens, cookies, passwords, or secrets.
