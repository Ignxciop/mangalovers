# Backend Architecture

## Stack
- Express 5, JavaScript ESM, Prisma 6, PostgreSQL.

## Layer separation

| Layer | Role | Imports from |
|-------|------|-------------|
| **Routes** | Define endpoints, connect validators + controller | Validator, Controller |
| **Controller** | Extract data from `req`, call service, respond `{ success, message, data }`, forward errors with `next(error)` | Service |
| **Service** | Business logic, throw errors with `error.statusCode` | Prisma (via `src/config/prisma.js`) |
| **Validator** | Validate structure with `express-validator` (no business logic) | express-validator |

- Prisma is NEVER used directly from controller or routes.
- Local imports use explicit `.js` extension.
- Controllers can be classes with static methods (Auth, AdminMetrics) or exported functions (manga, adminUsers). Follow the existing module style.
- Validators are in separate files per module (e.g. `auth.validation.js`, `friends.validation.js`) using `body()`, `param()`, `query()` from `express-validator`.

## Prisma schema (26 models)

Core: `User`, `Series`, `Chapter`, `Page`, `Genre`, `SeriesGenre`, `SeriesAlias`, `Provider`, `ProviderSeries`, `ProviderChapter`, `ScraperConfig`
Reading: `UserFavorite`, `UserChapterRead`, `UserActivity`
Social: `Friend`, `PushSubscription`, `RefreshToken`
Scraper: `ScraperRun`
Admin/Suggestions: `Suggestion`, `Announcement`, `Notification`

```bash
pnpm prisma migrate dev       # Dev: apply migrations + generate client
pnpm prisma migrate deploy    # Production/Docker: apply only
pnpm prisma generate          # Regenerate client without migrating
```

PostgreSQL must be running and `DATABASE_URL` set in `backend/.env`. See `backend/.env.example`.

## Scraper architecture

- **3 providers**: Olympus (olympus), ManhwaWeb (manhwaweb), LeerMangaEsp (leermangaesp).
- **Incremental by design**: `MAX_CONSECUTIVE_EXISTING = 10` — stop iterating chapters when 10 consecutive `ProviderChapter` records already exist. Olympus and ManhwaWeb scrapers were already compliant; LeerMangaEsp was recently updated.
- **Lock per provider**: `_runningProviders` Set prevents concurrent runs. `AbortController` per provider (via `scraperAbort.js`). `stopScraper(provider)` signals abort; `finally` block cleans up.
- **ScraperConfig model**: `autoEnabled` (boolean), `intervalMinutes` (int), `enabledProviders` (JSON array of provider names).
- **Cron**: `scraperCron.js` reads `enabledProviders` from DB, passes filtered list to `runAllScrapers(triggeredBy, providers)`.
- **Run tracking**: `ScraperRun` records `triggeredBy` (manual|cron), provider, status, counts, errors. `trackRun()` creates the record (auto-finalizes on error).
- **Missing pages**: `GET /admin/scraper/missing-pages` finds chapters with no pages. `POST /admin/scraper/refill-pages/:provider` runs `runPagesOnly()` to refill.

## Series clustering

- `resolveSeriesCluster()` recursively finds all members of a cluster (handles arbitrary depth).
- `getAllManga()` and `getLatestManga()` expand cluster IDs to include all members.
- `normalizeFavoriteCluster()` maps series within a cluster to the primary ID.
- Frontend `useMangaList` cache key includes `user?.id ?? "anon"` to avoid stale auth-dependent data.

## Middleware chain

- `auth.js`: JWT verification, optional vs required mode.
- `errorHandler.js`: catches `error.statusCode`, returns `{ success: false, message, errors }`.
- `rateLimiter.js`: per-IP rate limiting.
- Admin routes check `req.user.role === "admin"`.

## Maintenance scripts
Located in `backend/src/scripts/`: VAPID generation, dedup, manual scrapers, fixes.
