# VIMS Data Platform

## Core choice

Use PostgreSQL as the transactional source of truth and Redis as the shared cache and queue-adjacent runtime store.

- PostgreSQL stores tenant, inventory, CRM, website, and audit data.
- Redis is reserved for cache keys, rate limits, sessions if needed, and short-lived coordination data.

## Why Drizzle is a good fit here

Drizzle works well for this repo because it keeps schema definitions close to the code that owns them and lets you generate SQL migrations without forcing every domain into one giant ORM model layer.

For VIMS, that matters because:

- tenancy owns tenancy tables
- inventory owns vehicle and merchandising tables
- CRM owns leads and pipeline tables
- websites owns website publishing tables

## Migration rules

These are required rules for this codebase:

1. Every bounded context owns its own schema file under `src/db/schema.ts`.
2. Every bounded context owns its own migration directory under `drizzle/`.
3. Migrations are generated per package, never into a shared catch-all folder.
4. Cross-domain foreign keys are allowed only when the upstream domain is stable and intentionally referenced.
5. Shared helpers live in `@vims/database-postgres`; table definitions do not.
6. New domains must add their own `drizzle.config.ts` and register themselves in `scripts/db-manifest.mjs`.
7. Generated Drizzle SQL files inside each package are the source of truth for migration execution.

## Package ownership

```txt
packages/modules/tenancy/
  src/db/schema.ts
  drizzle/
  drizzle.config.ts

packages/modules/inventory/
  src/db/schema.ts
  drizzle/
  drizzle.config.ts

packages/modules/crm/
  src/db/schema.ts
  drizzle/
  drizzle.config.ts

packages/modules/websites/
  src/db/schema.ts
  drizzle/
  drizzle.config.ts
```

## Commands

```bash
cp .env.example .env
npm run db:up
npm run db:generate
npm run db:migrate
```

## Extraction path

When a bounded context becomes a service:

- it keeps its package-owned schema history
- it can move its migration directory with it
- it still consumes shared contracts
- it does not inherit unrelated migrations from other domains
