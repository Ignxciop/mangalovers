# Mangalovers

**Plataforma web para lectura y seguimiento de manga, manhwa y manhua — libre de anuncios, con tracking de lectura, estadísticas, notificaciones push y sistema social.**

---

## Para reclutadores no técnicos

### ¿Qué hace esta aplicación?

Mangalovers es un lector de manga online que permite a los usuarios:

- **Navegar y descubrir** series por género, estado (activo, finalizado, hiatus) y ordenarlas por actualización, cantidad de capítulos o nombre.
- **Leer cómodamente** con dos modos de visualización: desplazamiento continuo (cascade) o página por página, con zoom ajustable. Las imágenes se cargan con lazy loading (IntersectionObserver), retry con timeout y fallback automático entre proveedores sin que el usuario note cambios.
- **Llevar registro** de lo que han leído: los capítulos se marcan automáticamente al abrirlos, y el sistema muestra el progreso de cada serie.
- **Ver estadísticas detalladas** de lectura: total de capítulos leídos, páginas estimadas, horas invertidas, rachas, heatmap de actividad mensual y los géneros más leídos.
- **Recibir notificaciones push** cuando se publican nuevos capítulos de sus series favoritas.
- **Gestionar favoritos** con estados como "Siguiendo" o "Terminado".
- **Conectar con amigos**: enviar/recibir solicitudes, buscar usuarios, bloquear/desbloquear y ver qué capítulos leyeron tus amigos en cada serie.
- **Sugerir series** desde la interfaz para que los administradores consideren agregarlas.

### ¿Qué problema resuelve?

Actualmente, leer manga online implica lidiar con sitios llenos de publicidad invasiva, enlaces rotos y sin forma de llevar un seguimiento de lectura entre sesiones. Mangalovers centraliza contenido de múltiples fuentes en un solo lugar, sin anuncios, y añade funcionalidades propias de plataformas de lectura profesional: progreso automático, estadísticas, notificaciones y sistema social entre amigos.

### ¿Quién usarla?

Cualquier persona interesada en leer manga, manhwa o manhua en español que quiera una experiencia limpia, organizada y con seguimiento personalizado.

---

## Para reclutadores técnicos

### Stack tecnológico

| Capa                | Tecnología                                                                           |
| ------------------- | ------------------------------------------------------------------------------------ |
| **Frontend**        | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, shadcn/ui, Zustand, React Router 7 |
| **Backend**         | Node.js 20, Express 5, JavaScript (ESM)                                              |
| **Base de datos**   | PostgreSQL con Prisma ORM 6                                                          |
| **Autenticación**   | JWT con refresh token rotation (bcryptjs + jsonwebtoken)                             |
| **Notificaciones**  | Web Push API con VAPID                                                               |
| **Scraping**        | Axios + node-cron (automático, incremental por proveedor)                            |
| **Infraestructura** | Docker + Docker Compose, Nginx, Cloudflare Tunnel                                    |
| **Calidad**         | ESLint + typescript-eslint, GitHub Actions CI, 279 tests                             |

### Arquitectura

```
                    Cloudflare Tunnel
                           |
                        Nginx (frontend:4007)
                        /                   \
              SPA (React/TS)        Proxy /api → backend:4008
                                            |
                                     Express API
                                          |
                                      PostgreSQL
```

- **Frontend**: SPA en React con routing del lado del cliente. Los estilos usan Tailwind CSS 4 con componentes shadcn/ui. El estado global de autenticación se maneja con Zustand con persistencia en localStorage.
- **Backend**: API REST modular (auth, manga, favorites, reads, notifications, friends, admin). Cada módulo sigue el patrón Controller → Service → Prisma, con validadores separados usando express-validator.
- **Base de datos**: PostgreSQL con **26 modelos** (User, Series, Chapter, Page, Genre, Provider, ProviderSeries, ProviderChapter, ScraperConfig, SeriesAlias, SeriesGenre, UserFavorite, UserChapterRead, PushSubscription, RefreshToken, Friend, ScraperRun, UserActivity, Suggestion, Announcement, Notification, etc.).
- **Scrapers**: **3 proveedores** (Olympuscope, ManhwaWeb, LeerMangaEsp) con extracción independiente y lock por proveedor. Un cron job lee los proveedores habilitados desde la base de datos y ejecuta la recolección cada hora. Cada ejecución se persiste en `ScraperRun` con snapshot de serie (series procesadas, capítulos creados, errores) y campo `triggeredBy` (manual/cron). Las series se deduplican entre proveedores mediante matching por tokens (SeriesAlias + clustering recursivo).
- **Scraping incremental**: Todos los scrapers usan `MAX_CONSECUTIVE_EXISTING = 10` para detener la iteración al encontrar capítulos existentes. Nunca recorren todos los capítulos de una serie ni todas las series en cada ejecución.
- **Image loading optimizado**: `IntersectionObserver` con `rootMargin="400px"` para lazy loading de imágenes de capítulos. Timeout de 8s con retry automático. Fallback transparente entre proveedores sin banners ni botones visibles para el usuario. Cover images con timeout de 5s y detección de placeholders (imágenes menores a 100px).
- **Admin**: Panel completo con dashboard de métricas (overview, scrapers, usuarios, contenido, sistema), gestión de usuarios (roles/estados), sugerencias con estados, registro de actividad global, auditoría de acciones administrativas, y herramientas de scraper (run/stop por proveedor, toggle auto-scraper, refill de páginas faltantes).

### Principales decisiones técnicas

- **Refresh token rotation**: Cada vez que se renueva un token, el anterior se revoca. Si un token revuelto se reutiliza, se invalida toda la familia de tokens (detección de robo).
- **Optional authentication**: La mayoría de endpoints de lectura funcionan sin autenticación (modo invitado), pero si el usuario está logueado se actualiza su progreso automáticamente.
- **Smart series matching**: Alias manager + tokenización para detectar si dos series de distintos proveedores son la misma, evitando duplicados (series clustering recursivo).
- **Fallback transparente**: El lector usa páginas del proveedor alternativo por defecto cuando están disponibles. No hay UI que muestre "cambiando de proveedor" — el usuario nunca percibe la conmutación.
- **Per-provider abort**: Cada scraper tiene su propio `AbortController`. Se puede detener un proveedor individual sin afectar a los demás.
- **PWA-ready**: Service Worker para notificaciones push y manifest.json para instalación como app.
- **Contenerización completa**: Docker Compose orquesta frontend, backend y túnel Cloudflare para despliegue inmediato.

### API endpoints principales

| Método             | Endpoint                                           | Auth     | Descripción                                                              |
| ------------------ | -------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| GET                | `/api/health`                                      | No       | Health check del servidor                                                |
| **Auth**           |                                                    |          |                                                                          |
| POST               | `/api/auth/register`                               | No       | Registro de usuario                                                      |
| POST               | `/api/auth/login`                                  | No       | Inicio de sesión                                                         |
| POST               | `/api/auth/google`                                 | No       | Inicio de sesión con Google                                              |
| POST               | `/api/auth/refresh`                                | No       | Renovar token JWT                                                        |
| POST               | `/api/auth/logout`                                 | Sí       | Cerrar sesión                                                            |
| POST               | `/api/auth/logout-all`                             | Sí       | Cerrar todas las sesiones activas                                        |
| GET                | `/api/auth/me`                                     | Sí       | Perfil del usuario autenticado                                           |
| GET                | `/api/auth/sessions`                               | Sí       | Sesiones activas                                                         |
| PATCH              | `/api/auth/profile`                                | Sí       | Actualizar perfil                                                        |
| PATCH              | `/api/auth/password`                               | Sí       | Cambiar contraseña                                                       |
| DELETE             | `/api/auth/account`                                | Sí       | Eliminar cuenta                                                          |
| GET                | `/api/auth/google-client-id`                       | No       | Obtener client ID de Google OAuth                                        |
| **Manga**          |                                                    |          |                                                                          |
| GET                | `/api/manga`                                       | Optional | Listado paginado con filtros (search, status, genre, sort, type)         |
| GET                | `/api/manga/latest`                                | Optional | Últimas series actualizadas                                              |
| GET                | `/api/manga/genres`                                | No       | Todos los géneros disponibles                                            |
| GET                | `/api/manga/recommended`                           | Sí       | Recomendaciones basadas en géneros más leídos                            |
| GET                | `/api/manga/:slug`                                 | Optional | Detalle de serie con sus capítulos                                       |
| GET                | `/api/manga/capitulo/:slug/:chapterId/pages`       | Optional | Páginas de un capítulo con navegación prev/next                          |
| **Favoritos**      |                                                    |          |                                                                          |
| GET                | `/api/favorites`                                   | Sí       | Favoritos del usuario con progreso                                       |
| GET                | `/api/favorites/:seriesId`                         | Sí       | Verificar si una serie está en favoritos                                 |
| POST               | `/api/favorites`                                   | Sí       | Agregar o actualizar favorito (status: Siguiendo/Terminado)              |
| DELETE             | `/api/favorites/:seriesId`                         | Sí       | Eliminar favorito                                                        |
| **Lectura**        |                                                    |          |                                                                          |
| GET                | `/api/reads/series/:seriesId`                      | Sí       | IDs de capítulos leídos de una serie                                     |
| POST               | `/api/reads/chapter/:chapterId/toggle`             | Sí       | Marcar/desmarcar capítulo como leído                                     |
| POST               | `/api/reads/chapter/:chapterId/mark-until`         | Sí       | Marcar todos los capítulos hasta este como leídos                        |
| GET                | `/api/reads/stats`                                 | Sí       | Estadísticas de lectura                                                  |
| GET                | `/api/reads/full-stats`                            | Sí       | Estadísticas detalladas con heatmap, rachas, géneros                     |
| **Amigos**         |                                                    |          |                                                                          |
| GET                | `/api/friends`                                     | Sí       | Lista de amigos aceptados                                                |
| GET                | `/api/friends/requests/received`                   | Sí       | Solicitudes de amistad recibidas                                         |
| GET                | `/api/friends/requests/sent`                       | Sí       | Solicitudes de amistad enviadas                                          |
| GET                | `/api/friends/blocked`                             | Sí       | Usuarios bloqueados                                                      |
| GET                | `/api/friends/search?q=`                           | Sí       | Buscar usuarios por nombre/apellido/apodo                                |
| POST               | `/api/friends/request`                             | Sí       | Enviar solicitud de amistad                                              |
| PATCH              | `/api/friends/request/:id/accept`                  | Sí       | Aceptar solicitud                                                        |
| PATCH              | `/api/friends/request/:id/reject`                  | Sí       | Rechazar solicitud                                                       |
| POST               | `/api/friends/block`                               | Sí       | Bloquear usuario                                                         |
| POST               | `/api/friends/unblock`                             | Sí       | Desbloquear usuario                                                      |
| DELETE             | `/api/friends/:userId`                             | Sí       | Eliminar amigo                                                           |
| GET                | `/api/friends/series/:seriesId/reads`              | Sí       | Último capítulo leído por cada amigo en una serie                        |
| **Notificaciones** |                                                    |          |                                                                          |
| GET                | `/api/notifications/vapid-public-key`              | No       | Clave pública VAPID para Web Push                                        |
| POST               | `/api/notifications/subscribe`                     | Sí       | Suscribirse a notificaciones push                                        |
| DELETE             | `/api/notifications/unsubscribe`                   | Sí       | Cancelar suscripción push                                                |
| GET                | `/api/notifications/status`                        | Sí       | Estado de la suscripción push                                            |
| **Admin — Métricas**|                                                    |          |                                                                          |
| GET                | `/api/admin/metrics/overview`                      | Admin    | Dashboard general (usuarios, series, sugerencias, scraper)               |
| GET                | `/api/admin/metrics/scrapers`                      | Admin    | Métricas detalladas de scrapers (timeline, proveedores)                  |
| GET                | `/api/admin/metrics/users`                         | Admin    | Métricas de usuarios (registros, activos, top lectores)                  |
| GET                | `/api/admin/metrics/content`                       | Admin    | Métricas de contenido (géneros, histograma, estado)                      |
| GET                | `/api/admin/metrics/system`                        | Admin    | Métricas del sistema (eventos, errores, rate limits)                     |
| **Admin — Usuarios**|                                                    |          |                                                                          |
| GET                | `/api/admin/users`                                 | Admin    | Lista paginada de usuarios                                               |
| PATCH              | `/api/admin/users/:id/role`                        | Admin    | Cambiar rol de usuario                                                   |
| PATCH              | `/api/admin/users/:id/status`                      | Admin    | Cambiar estado de usuario                                                |
| GET                | `/api/admin/users/:id/activity`                    | Admin    | Actividad de un usuario                                                  |
| **Admin — Sugerencias**|                                                  |          |                                                                          |
| GET                | `/api/admin/suggestions`                           | Admin    | Sugerencias paginadas                                                    |
| PATCH              | `/api/admin/suggestions/:id/status`                | Admin    | Cambiar estado de sugerencia                                             |
| **Admin — Scraper**|                                                    |          |                                                                          |
| GET                | `/api/admin/scraper/config`                        | Admin    | Obtener configuración del scraper                                        |
| PUT                | `/api/admin/scraper/config`                        | Admin    | Actualizar configuración (autoEnabled, intervalMinutes, enabledProviders)|
| POST               | `/api/admin/scraper/run/:provider`                 | Admin    | Ejecutar scraper manualmente para un proveedor                           |
| POST               | `/api/admin/scraper/stop/:provider`                | Admin    | Detener scraper de un proveedor                                          |
| GET                | `/api/admin/scraper/status`                        | Admin    | Estado actual de todos los scrapers (running, lastRun, etc.)             |
| GET                | `/api/admin/scraper/missing-pages`                 | Admin    | Capítulos sin páginas (con proveedor)                                    |
| POST               | `/api/admin/scraper/refill-pages/:provider`        | Admin    | Refill páginas de un proveedor                                           |
| **Admin — General**|                                                    |          |                                                                          |
| GET                | `/api/admin/activity`                              | Admin    | Registro de actividad global                                             |
| GET                | `/api/admin/metrics`                               | Admin    | Métricas generales del sistema                                           |

### Ejecutar localmente

```bash
# Requisitos: Node.js 20, pnpm, PostgreSQL en ejecución

# Backend
cd backend
pnpm install
cp .env.example .env  # configurar DATABASE_URL y JWT_SECRET
pnpm prisma migrate dev
pnpm dev

# Frontend
cd frontend
pnpm install
cp .env.example .env  # configurar VITE_API_URL
pnpm dev
```

O con Docker:

```bash
docker compose up -d
```

### CI/CD

Cada `push` a cualquier rama y cada `pull_request` hacia `main` ejecuta automáticamente:

| Workflow            | Disparador                         | Pasos                                                                                             |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| **CI**              | Push a cualquier rama, PR a `main` | `backend`: install → prisma generate → migrate → lint → test · `frontend`: install → lint → build |
| **Promote staging** | Push a `staging`                   | Espera 10 min de estabilidad → Crea/actualiza PR `staging` → `main`                               |

Los tests del backend requieren una base de datos PostgreSQL efímera que GitHub Actions levanta como service container. Las credenciales y claves se pasan como variables de entorno inline (sin secrets de producción).

#### Flujo de trabajo recomendado

```
feature/xxx  →  PR  →  staging  (CI)
                          ↓
                    ⏳ 10 min sin cambios
                          ↓
                    PR automático  →  main  (CI)
                          ↓
                    Merge manual
```

1. Crear rama desde `main`: `git switch -c feat/mi-cambio`
2. Trabajar, commitar, pushear: `git push -u origin feat/mi-cambio`
3. Abrir PR de `feat/mi-cambio` → `staging`
4. Al mergear a `staging`, el CI corre y el workflow `Promote staging` espera 10 min
5. Si no hay nuevos cambios en esos 10 min, se auto-crea un PR de `staging` → `main`
6. Revisar el PR y hacer click en **Merge** cuando corresponda

> Las ramas `main` y `staging` deben tener protección activada en GitHub Settings → Branches: requerir PR con CI verde, bloquear push directo.

### Estructura del proyecto

```
backend/
├── prisma/
│   ├── schema.prisma           # 26 modelos: usuarios, series, scrapers, favoritos, amigos, etc.
│   └── migrations/             # Migraciones generadas por Prisma
├── src/
│   ├── auth/                   # Registro, login, JWT, refresh tokens, Google OAuth
│   ├── admin/                  # Panel admin: usuarios, sugerencias, métricas, actividad, scraper
│   │   ├── adminUserRoutes/Controller/Service       # CRUD usuarios + actividad por usuario
│   │   ├── adminAuditService.js                     # Auditoría de acciones administrativas
│   │   ├── adminSuggestionRoutes/Controller/Service # Sugerencias con estados
│   │   ├── adminMetricsController.js                # 6 handlers
│   │   ├── adminMetricsService.js                   # 5 métodos con queries Prisma + raw SQL
│   │   └── scraperAdminRoutes/Controller/Service    # Config, run/stop, status, missing-pages, refill
│   ├── manga/                 # Series, capítulos, scraping (3 scrapers), dedup
│   │   └── scrapers/
│   │       ├── scraper.js           # runAllScrapers, runSingleProvider, runPagesOnly, stopScraper
│   │       ├── scraperAbort.js      # AbortController per provider
│   │       ├── olympus/             # Olympus provider scraper
│   │       ├── manhwaweb/           # ManhwaWeb provider scraper
│   │       └── leermangaesp/        # LeerMangaEsp provider scraper
│   ├── favorite/              # Favoritos del usuario
│   ├── friends/               # Amigos: solicitudes, bloqueos, actividad de lectura
│   ├── read/                  # Tracking de lectura y estadísticas
│   ├── notifications/         # Push notifications (web-push)
│   ├── middlewares/           # Auth middleware, error handler, rate limiter
│   ├── jobs/                  # Cron de scraping automático
│   ├── scripts/               # Utilidades: seed, dedup, fixes, scraper runners
│   └── config/                # Prisma client, env, email validation

frontend/
├── src/
│   ├── pages/                 # mangaList, mangaDetail, chapterReader, statsPage, friendsPage,
│   │                          # profilePage, adminDashboard, adminUsers, adminMetrics,
│   │                          # adminSuggestions, adminActivityLogs, adminAuditLogs, adminTools
│   ├── hooks/                 # useMangaList, useAuth, useAutoFetch, useChapterPages,
│   │                          # useReadingProgress, useFriends, useSidebar, useDebounce, etc.
│   ├── api/
│   │   ├── axios.ts           # Cliente Axios con interceptor JWT + refresh queue
│   │   ├── admin.ts           # Funciones admin: users, suggestions, activity, metrics, scraper
│   │   ├── friends.ts         # API de amigos y FriendSeriesRead
│   │   ├── manga.ts           # API de series y capítulos
│   │   ├── reads.ts           # API de tracking de lectura y estadísticas
│   │   ├── favorites.ts       # API de favoritos
│   │   └── notifications.ts   # API de suscripción push
│   ├── store/                 # Zustand store (auth con persist)
│   ├── components/            # chapterImage, coverImage, pageContent, paginationControls,
│   │                          # avatar, friendSeriesReadSection, seoHelmet, secondaryNavbar,
│   │                          # ui/ (shadcn/ui components)
│   └── types/
│       ├── manga.ts           # Series, Chapter, Page, etc.
│       ├── admin.ts           # AdminUser, OverviewMetrics, ScraperRun, etc.
│       └── friends.ts         # Friend, FriendRequest, FriendSeriesRead
```
