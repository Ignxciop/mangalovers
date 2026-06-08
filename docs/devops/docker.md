# DevOps / Docker

## Full stack
```bash
docker compose up -d
```

## Architecture
- nginx serves frontend on port `:4007`.
- nginx reverse proxies `/api` → backend on `:4008`.

## Network
- Docker compose expects external network `dokploy-network`.
- Requires `CLOUDFLARE_TUNNEL_TOKEN` environment variable.

## Runtime operations
- `seedProviders()` runs automatically when backend starts.
- `scraperCron.js` reads `enabledProviders` from `ScraperConfig` DB and runs scrapers every configured interval (default 1h).
- Manual scrapers in `backend/src/scripts/` or via `/admin/scraper/run/:provider`.
- **PostgreSQL backup**: external cron job at `0 16 * * *` → `~/backups/mangalovers-db` with `pg_dump --format=custom`. Not inside the repo.
