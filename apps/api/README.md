# API Service Placeholder

This workspace is reserved for the first extracted backend service.

Do not move business logic here until one of these becomes true:

- independent scaling is required
- the deployment cadence must differ from `@vims/web`
- background processing or external integrations need isolated runtime guarantees
- network boundaries are needed for compliance or tenancy concerns

Until then, keep domain logic inside shared packages and expose it through the web app.
