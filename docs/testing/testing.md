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
148 tests total:
- auth (19), favorites (12), reads (9), manga (20), notifications (7)
- middleware unit (11), adminUser (8), adminMetrics (2)

Admin tests require `DATABASE_TEST_URL` and seed data (providers).

## Configuration
- `vitest.config.js`: `fileParallelism: false` to avoid collisions on shared test DB.

## Helpers
- `tests/helpers/factories.js` — createUser, createSeries, createChapter, createGenre, createProvider
- `tests/helpers/app.js` — buildApp
- `tests/helpers/auth.js` — generateAccessToken
- `tests/setup.js` — overwrites `DATABASE_URL` globally before importing the app.
