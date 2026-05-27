# Mangalovers — Guía para OpenCode

## Estructura del proyecto

- `backend/` — Express 5, JavaScript ESM, Prisma 6, PostgreSQL.
- `frontend/` — React 19, TypeScript 5.9, Vite 7, Tailwind 4, shadcn/ui, Zustand, React Router 7.
- Cada uno con su `package.json`. **No hay workspace raíz** — los comandos se corren por separado.

## Comandos

Siempre usar `pnpm`, nunca `npx`.

```bash
# Backend
cd backend && pnpm install && pnpm prisma migrate dev && pnpm dev

# Frontend
cd frontend && pnpm install && pnpm dev
pnpm build   # tsc -b && vite build
pnpm lint    # eslint .

# Full stack
docker compose up -d
```

## Prisma

- `pnpm prisma migrate dev` — desarrollo (aplica migraciones + genera client).
- `pnpm prisma migrate deploy` — producción/Docker (solo apply).
- `pnpm prisma generate` — regenerar client sin migrar.
- PostgreSQL debe estar corriendo y `DATABASE_URL` configurada en `backend/.env`.
- Hay archivos `.env.example` en backend y frontend como referencia para crear los `.env`.

## Backend: arquitectura por capas

- **Routes** → define endpoints, conecta validators + controller.
- **Controller** → extrae datos de `req`, llama al service, responde `{ success, message, data }`, deriva errores con `next(error)`.
- **Service** → lógica de negocio, lanza errores con `error.statusCode`.
- **Validator** → validación con `express-validator` (solo estructura, no lógica).
- **Prisma** → acceso a BD vía `src/config/prisma.js`. Nunca se usa directamente desde controller o routes.
- Imports locales con extensión `.js` explícita. Controller puede ser clase con métodos static (auth) o funciones exportadas sueltas (manga, adminMetrics); usar el estilo del módulo existente.
- `AdminMetricsController` y `AdminMetricsService` son clases con métodos static, mismo patrón que Auth.
- Las páginas admin siguen el layout consistente: `min-h-screen bg-background flex flex-col overflow-x-hidden` en el contenedor raíz, `container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0` en `<main>`.

## Frontend: convenciones

- Alias `@/` → `src/` (tsconfig + vite resolve).
- Estado global: Zustand con `persist` en localStorage (`mangalovers-auth`).
- Axios en `src/api/axios.ts` con interceptor que refresca JWT silenciosamente (cola con dedup).
- shadcn/ui en `src/components/ui/`, config en `components.json`.
- Páginas en `pages/`, hooks en `hooks/`, tipos compartidos en `types/manga.ts`.

## Testing

- **Backend**: Vitest + Supertest con `DATABASE_TEST_URL` en `.env`.
  ```bash
  cd backend
  pnpm test              # Todos los tests
  pnpm test:watch        # Watch mode
  pnpm test:integration  # Solo integration
  pnpm test:unit         # Solo unit (cuando existan)
  ```
- La test DB se limpia (`TRUNCATE CASCADE`) entre cada test.
- Antes de testear, migrar la test DB:
  ```bash
  DATABASE_URL="postgresql://postgres:1243@localhost:5432/mangalovers-db-tests" pnpm prisma migrate deploy
  ```
- Tests existentes: auth (19), favorites (12), reads (9), manga (20), notifications (7), middleware unit (11), adminUser (8), adminMetrics (2) — **148 tests**.
- Tests de admin requieren `DATABASE_TEST_URL` y datos seed (proveedores).
- Vitest config (`vitest.config.js`): `fileParallelism: false` para evitar colisiones en test DB compartida.
- Helpers: `tests/helpers/factories.js` (createUser, createSeries, createChapter, createGenre, createProvider), `tests/helpers/app.js` (buildApp), `tests/helpers/auth.js` (generateAccessToken).
- `tests/setup.js` sobreescribe `DATABASE_URL` globalmente antes de importar la app.

## Skills de OpenCode

Skills instalados en `.agents/skills/` y `.opencode/skills/`. Se cargan automáticamente al iniciar OpenCode.

### Cuándo cargar cada skill

| Cuando trabajes en… | Cargá estas skills primero |
|---|---|
| **Backend** (routes, controllers, services, middlewares) | `nodejs-backend-patterns` + `nodejs-express-server` + `nodejs-best-practices` |
| **Prisma** (schema, queries, migraciones) | `prisma-client-api` + `prisma-cli` |
| **Tests backend** | `vitest` |
| **Frontend** (componentes, páginas, estilos) | `frontend-design` + `tailwind-v4-shadcn` + `tailwind-css-patterns` + `shadcn` + `vercel-react-best-practices` + `ui-ux-pro-max` |
| **Tipos TypeScript** | `typescript-advanced-types` |
| **SEO / a11y** | `seo` + `accessibility` |
| **Docker / infra** | `docker-expert` |
| **Vite** (config, build) | `vite` |

### Backend

| Skill | Propósito |
|---|---|
| `nodejs-backend-patterns` | Patrones de backend Express/Fastify, middleware, auth, API design |
| `nodejs-best-practices` | Principios Node.js, async, seguridad, arquitectura |
| `nodejs-express-server` | Servidores Express, routing, middleware chains |
| `prisma-cli` | Comandos Prisma CLI (init, generate, migrate, studio, mcp) |
| `prisma-client-api` | Consultas Prisma Client (CRUD, filtros, transacciones) |
| `prisma-database-setup` | Configuración de Prisma con PostgreSQL, MySQL, etc. |
| `prisma-postgres` | Setup y operaciones Prisma Postgres |
| `vitest` | Tests unitarios/integración con Vitest |

### Frontend

| Skill | Propósito |
|---|---|
| `frontend-design` | Diseño frontend de alta calidad sin estética AI genérica |
| `vercel-react-best-practices` | 70 reglas de performance React/Next.js de Vercel Engineering |
| `web-design-guidelines` | Revisión de UI contra guías de diseño web |
| `accessibility` | Auditoría y mejora de accesibilidad WCAG 2.2 |
| `composition-patterns` | Patrones de composición React (compound components, render props) |
| `seo` | Optimización para motores de búsqueda |
| `shadcn` | Gestión de componentes shadcn/ui |
| `tailwind-css-patterns` | Patrones de estilo Tailwind CSS |
| `tailwind-v4-shadcn` | Setup Tailwind v4 + shadcn/ui |
| `typescript-advanced-types` | Tipos avanzados TypeScript |
| `ui-ux-pro-max` | Guías UI/UX, paletas, tipografías, estilos |
| `vite` | Configuración y plugins de Vite |

### Docker

| Skill | Propósito |
|---|---|
| `docker-expert` | Contenerización Docker, optimización, multi-stage, orquestación |

## Notas adicionales

- SW (`public/sw.js`) solo maneja notificaciones push, sin caché offline.
- `cn()` de shadcn/ui en `@/lib/utils` para combinar clases Tailwind.
- Frontend sin `pnpm typecheck` standalone; `tsc -b` corre dentro de `pnpm build`.
- Scripts de mantenimiento en `backend/src/scripts/` (VAPID, dedup, scrapers manuales).
- Git: commits en español, informales.

## Git Workflow

Cada modificación al proyecto debe hacerse en una **rama nueva** desde `main`. Nunca se trabaja directo en `main`.

> **Regla de rama por cambio**: cada petición de cambio (bugfix, feature, refactor) crea su propia rama independiente. Si la rama actual es `fix/logout` y el usuario pide algo de home.tsx sin relación, se crea `fix/otra-cosa` desde `main` y se trabaja allá. No mezclar cambios no relacionados en una misma rama.

### Nomenclatura de ramas

| Tipo | Prefijo | Ejemplo |
|---|---|---|
| Feature nueva | `feat/` | `feat/dark-mode` |
| Bugfix | `fix/` | `fix/error-lectura` |
| Refactor | `refactor/` | `refactor/auth-service` |
| CI/CD | `ci/` | `ci/workers` |

### Flujo

```
main
  └── feat/mi-cambio  →  PR  →  staging  (CI)
                                  ↓
                            ⏳ 10 min (estabilidad)
                                  ↓
                            PR automático  →  main  (CI)
                                  ↓
                            Merge manual
```

1. Crear rama desde `main`: `git switch -c feat/mi-cambio`
2. Trabajar, commitar, pushear: `git push -u origin feat/mi-cambio`
3. Abrir **Pull Request** de `feat/mi-cambio` → `staging` en GitHub
4. Esperar que el CI pase y mergear
5. El workflow `Promote staging` espera 10 min sin cambios y auto-crea PR a `main`
6. Revisar y mergear el PR a `main`
7. Eliminar la rama local y remota: `git branch -d feat/mi-cambio`

> `main` y `staging` tienen protección activada: requieren PR con CI verde, push directo bloqueado.

- Docker: nginx sirve frontend (:4007) con proxy reverso `/api` → backend (:4008).

## Operaciones

- `seedProviders()` corre automáticamente al iniciar el backend.
- Cron de scraping automático cada hora. Scripts manuales en `backend/src/scripts/`.
- Docker compose espera red externa `dokploy-network` y requiere `CLOUDFLARE_TUNNEL_TOKEN`.
