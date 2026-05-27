# Backend Architecture

## Stack
- Express 5, JavaScript ESM, Prisma 6, PostgreSQL.

## Layer separation

| Layer | Role | Imports from |
|-------|------|-------------|
| **Routes** | Define endpoints, connect validators + controller | Validator, Controller |
| **Controller** | Extract data from `req`, call service, respond `{ success, message, data }`, derive errors with `next(error)` | Service |
| **Service** | Business logic, throw errors with `error.statusCode` | Prisma (via `src/config/prisma.js`) |
| **Validator** | Validate structure with `express-validator` (no business logic) | express-validator |

- Prisma is NEVER used directly from controller or routes.
- Local imports use explicit `.js` extension.
- Controllers can be classes with static methods (Auth) or exported functions (manga, adminMetrics). Follow the existing module style.
- `AdminMetricsController` and `AdminMetricsService` are classes with static methods (same pattern as Auth).
- Admin pages layout: `min-h-screen bg-background flex flex-col overflow-x-hidden` on root container, `container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0` on `<main>`.

## Prisma

```bash
pnpm prisma migrate dev       # Dev: apply migrations + generate client
pnpm prisma migrate deploy    # Production/Docker: apply only
pnpm prisma generate          # Regenerate client without migrating
```

PostgreSQL must be running and `DATABASE_URL` set in `backend/.env`. See `backend/.env.example`.

## Maintenance scripts

Located in `backend/src/scripts/`: VAPID, dedup, manual scrapers.
