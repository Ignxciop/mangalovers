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
- Cron scrapes series automatically every hour.
- Manual scrapers in `backend/src/scripts/`.
