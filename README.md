# VIMS

Vehicle inventory, CRM, and dealer website platform structured as a modular monolith with a clean path to microservices.

## Workspace layout

```txt
apps/
  web/
  api/
  worker/

packages/
  cli/
  core/
  design-system/
  modules/
  vims/

integration-tests/
  modules/
```

## Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run test:run
npm run db:up
npm run db:migrate
npm run changeset
npm run version:packages
npm run release:publish
```

## Architecture reference

See [`docs/architecture/modular-platform.md`](./docs/architecture/modular-platform.md) for the domain boundaries, extraction plan, and scaling rules.

Database and cache setup lives in [`docs/architecture/data-platform.md`](./docs/architecture/data-platform.md).
Framework structure and runtime ownership live in [`docs/architecture/modular-platform.md`](./docs/architecture/modular-platform.md).

## Release Flow

Framework packages version through Changesets and publish from their `dist/` outputs.

1. Create a release note with `npm run changeset`
2. Apply version bumps with `npm run version:packages`
3. Verify with `npm run build && npm run test:run`
4. Publish with `npm run release:publish`
