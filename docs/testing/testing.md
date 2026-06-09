# Testing

## Backend tests
- Framework: Vitest + Supertest.
- Test DB: `DATABASE_TEST_URL` in `.env`.

```bash
cd backend
pnpm test              # All tests
pnpm test:watch        # Watch mode
pnpm test:integration  # Integration only
pnpm test:unit         # Unit only (when they exist)
```

## Test database
- Test DB is truncated (`TRUNCATE CASCADE`) between each test.
- Before testing, migrate the test DB:
  ```bash
  DATABASE_URL="postgresql://postgres:1243@localhost:5432/mangalovers-db-tests" pnpm prisma migrate deploy
  ```

## Existing tests
279 tests total:
- auth (19), favorites (12), reads (9), manga (20), notifications (7)
- middleware unit (11), adminUser (8), adminMetrics (2)
- **friends (38)** — request/accept/reject, search, block/unblock, friend reads per series
- **scraper (153)** — lock, abort, run, status, per-provider execution, stopping, `triggeredBy`, config CRUD, missing pages, refill pages, `MAX_CONSECUTIVE_EXISTING`, early termination
  - `scraper.unit.test.js` (52): lock, abort, triggers, enabledProviders filter, pages-scrape abort, missing-pages
  - `scraper.integration.test.js` (101): full run cycles with providers, duplicate skipping, config persistence, crawler integration

Admin tests require `DATABASE_TEST_URL` and seed data (providers).

## Configuration
- `vitest.config.js`: `fileParallelism: false` to avoid collisions on shared test DB.
- Scraper tests use a 60-second timeout for provider-heavy integration tests.

## Helpers
- `tests/helpers/factories.js` — createUser, createSeries, createChapter, createGenre, createProvider, createScraperConfig
- `tests/helpers/app.js` — buildApp
- `tests/helpers/auth.js` — generateAccessToken
- `tests/helpers/scraper.js` — mock provider responses, `runSingleProvider()` wrappers
- `tests/helpers/prisma.js` — cleaned test client
- `tests/setup.js` — overwrites `DATABASE_URL` globally before importing the app.
