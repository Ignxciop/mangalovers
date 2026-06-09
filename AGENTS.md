# MANGALOVERS — AGENT PROTOCOL

## [REQUIRED] PRECHECK — RESPOND BEFORE ANY CODE

Before analyzing or modifying any code, OUTPUT EXACTLY:

```
PRECHECK
Área: backend | frontend | docker | docs | other
Skills: [list all skills you will load]
Archivos afectados: [ruta1, ruta2, ...]
Tipo de cambio: bugfix | feature | refactor | docs | chore
Riesgo: alto | medio | bajo
```

**NO analysis. NO code. NO reading files. Until PRECHECK is output.**

---

## [NON-NEGOTIABLE] Dialect

Never use Argentine voseo ("tenés", "probá", "seleccioná", "andá", "decí", "vení", "hacé"). Use neutral Latin American Spanish: "tienes", "prueba", "selecciona", "anda", "di", "ven", "haz". Applies to code (comments, strings, UI) AND conversation.

---

## [MANDATORY] Skill Loading

Identify the area of the change (directory, file, or context). Then load EVERY skill in that group. NO EXCEPTIONS. NO SELECTIVITY. NO THINKING.

### BACKEND (routes, controllers, services, middlewares, prisma, tests)
REQUIRED: `nodejs-backend-patterns`, `nodejs-best-practices`, `nodejs-express-server`, `prisma-cli`, `prisma-client-api`, `prisma-database-setup`, `prisma-postgres`, `vitest`

### FRONTEND (components, pages, hooks, styles, types, config)
REQUIRED: `frontend-design`, `tailwind-v4-shadcn`, `tailwind-css-patterns`, `shadcn`, `vercel-react-best-practices`, `ui-ux-pro-max`, `vercel-composition-patterns`, `typescript-advanced-types`, `seo`, `accessibility`, `vite`, `web-design-guidelines`

### DOCKER / INFRA
REQUIRED: `docker-expert`

### MULTIPLE AREAS
Load ALL skills from ALL applicable groups.

---

## [CRITICAL RULES]

| # | Rule |
|---|------|
| 1 | `pnpm` only — never `npx` or `npm` |
| 2 | Backend: Routes → Controller → Service → Prisma. Never Prisma from controller/routes. |
| 3 | Service throws errors with `error.statusCode`. Controller catches with `next(error)`. |
| 4 | Frontend: `@/` alias → `src/`. Zustand auth storage key: `mangalovers-auth`. |
| 5 | Build: `pnpm build` = `tsc -b && vite build` (frontend) |
| 6 | Lint: `pnpm lint` = `eslint .` (backend + frontend) |
| 7 | No `text-[10px]` or `text-[11px]` in admin pages — use `text-xs` minimum |
| 8 | Admin pages layout: `min-h-screen bg-background flex flex-col overflow-x-hidden` (root), `container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0` (`<main>`) |
| 9 | Scrapers: incremental — never iterate all chapters/series. Use `MAX_CONSECUTIVE_EXISTING = 10` to stop iteration when existing chapters are found. |
| 10 | Image fallback transparente: `chapterImage.tsx` usa IntersectionObserver + `loading="lazy"` nativo. `chapterReader.tsx` usa `fallbackPages` por defecto cuando existe. `coverImage.tsx` con `MAX_RETRIES=1`, `TIMEOUT_MS=5000`, `MIN_IMAGE_SIZE=100`. Sin banners ni botones de cambio de proveedor visibles al usuario. |
| 11 | Backend: Validators en archivos separados (`*.validation.js`), usan `express-validator` con `body()`, `param()`, `query()`. NO validación en controllers. |
| 12 | Series cluster: `resolveSeriesCluster()` busca recursivamente todos los miembros. `getAllManga`/`getLatestManga` expanden cluster IDs. `normalizeFavoriteCluster` mapea al primario. |

---

## [GIT RULES]

```
Branch per change. Never on main.
feat/ | fix/ | refactor/ | ci/
Create from main → PR to staging → CI → Promote to main → Delete branch
Commit in Spanish, informal.
```

Details: `/docs/workflows/git-workflow.md`

---

## [DETAILS]

| Area | Reference |
|------|-----------|
| Backend architecture + Prisma | `/docs/architecture/backend.md` |
| Frontend conventions | `/docs/frontend/conventions.md` |
| Testing (Vitest, helpers, setup) | `/docs/testing/testing.md` |
| Docker, nginx, deploy | `/docs/devops/docker.md` |
| Git workflow (full) | `/docs/workflows/git-workflow.md` |
| `.env.example` files | `backend/.env.example`, `frontend/.env.example` |

---

## [VIOLATIONS]

If you skip PRECHECK, skip skill loading, or use voseo, the user will correct you immediately. Do not let it happen.
