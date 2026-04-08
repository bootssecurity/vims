# VIMS Modular Platform Architecture

## Core stance

Build VIMS as a modular monolith with explicit bounded contexts. Keep one primary deployable until operational or organizational pressure justifies service extraction.

This gives you:

- one transactional source of truth
- one auth and tenancy model
- one deployment front door
- clean package boundaries
- a controlled path to microservices later

## Repository shape

```txt
apps/
  web/         # Next.js app router, back-office UI, dealer websites, BFF endpoints
  api/         # reserved for first extracted API service
  worker/      # reserved for async jobs and ingestion

packages/
  cli/
    create-vims-app/ # workspace scaffolder and future code generators
  core/
    config/    # runtime config loading and environment defaults
    container/ # service container used by the framework kernel
    events/    # event primitives shared across providers and modules
    framework/ # kernel contracts, module/provider definitions
    types/     # DTOs, events, service contracts
    utils/     # pure utilities with no domain ownership
  modules/
    auth/      # identity and session strategy primitives
    rbac/      # role and permission policy module
    audit/     # auditable action recording and event emission
    tenancy/   # organization, rooftop, hostname, policy context
    inventory/ # vehicles, merchandising, pricing, media references
    crm/       # leads, opportunities, activities, pipeline
    websites/  # section schemas, themes, publish state
  providers/
    database-postgres/ # postgres runtime and connection helpers
    cache-redis/       # redis cache provider
    event-bus-local/   # local event bus provider for framework events
  design-system/
    ui/         # shared React primitives and design system
integration-tests/
  modules/      # cross-module framework verification
```

## Rules that keep this scalable

1. `apps/web` can depend on any package.
2. Domain packages must not import from `apps/*`.
3. `packages/core/utils` cannot import from any domain package.
4. Cross-domain communication should happen through `packages/core/types`, `packages/core/framework`, or explicit orchestration code.
5. Database schema ownership should map to domains, even if the database remains shared.
6. Anything likely to become a service later must define stable DTOs and events before extraction.
7. Consumer apps should boot modules and providers through the framework runtime, not assemble them ad hoc inside routes.

## Recommended service extraction order

### 1. Inventory ingestion

Extract first when:

- third-party feed volume spikes
- VIN decoding and enrichment become expensive
- nightly imports block core traffic

### 2. Website publishing

Extract second when:

- publish operations become queue-heavy
- search indexing, cache invalidation, and static asset sync need isolated scaling

### 3. Communications

Extract third when:

- email, SMS, webhooks, and retry policies need dedicated vendor controls

## Open-source friendly stack

- Framework: Next.js App Router
- Monorepo orchestration: Turbo + npm workspaces
- Database: PostgreSQL
- ORM / SQL layer: Drizzle or Prisma
- Jobs: BullMQ, Trigger.dev, or a queue-backed worker
- Search later: Meilisearch or Typesense
- Object storage: Cloudflare R2 or S3-compatible storage
- Auth: self-owned auth service or a mature OSS-friendly auth layer
- Observability: OpenTelemetry + Grafana/Loki/Tempo or equivalent

## What not to do

- do not create a service per package
- do not let packages reach into each other’s tables directly
- do not treat the website builder as arbitrary HTML storage
- do not split admin UI and dealer websites into unrelated apps without shared contracts

## Builder stance

The website builder should be block-based and schema-driven:

- pages own ordered section trees
- sections map to typed components
- themes provide tokens, not arbitrary CSS
- dealer customization edits configuration, not framework code

## Kernel stance

The framework kernel should own:

- app config loading
- provider registration
- module dependency resolution
- service container registration
- event-friendly runtime composition
