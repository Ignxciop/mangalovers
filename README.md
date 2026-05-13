# Mangalovers

**Plataforma web para lectura y seguimiento de manga, manhwa y manhua — libre de anuncios, con tracking de lectura, estadísticas y notificaciones push.**

---

## Para reclutadores no técnicos

### ¿Qué hace esta aplicación?

Mangalovers es un lector de manga online que permite a los usuarios:

- **Navegar y descubrir** series por género, estado (activo, finalizado, hiatus) y ordenarlas por actualización, cantidad de capítulos o nombre.
- **Leer cómodamente** con dos modos de visualización: desplazamiento continuo (cascade) o página por página, con zoom ajustable.
- **Llevar registro** de lo que han leído: los capítulos se marcan automáticamente al abrirlos, y el sistema muestra el progreso de cada serie.
- **Ver estadísticas detalladas** de lectura: total de capítulos leídos, páginas estimadas, horas invertidas, rachas, heatmap de actividad mensual y los géneros más leídos.
- **Recibir notificaciones push** cuando se publican nuevos capítulos de sus series favoritas.
- **Gestionar favoritos** con estados como "Siguiendo" o "Terminado".

### ¿Qué problema resuelve?

Actualmente, leer manga online implica lidiar con sitios llenos de publicidad invasiva, enlaces rotos y sin forma de llevar un seguimiento de lectura entre sesiones. Mangalovers centraliza contenido de múltiples fuentes en un solo lugar, sin anuncios, y añade funcionalidades propias de plataformas de lectura profesional: progreso automático, estadísticas y notificaciones.

### ¿Quién usarla?

Cualquier persona interesada en leer manga, manhwa o manhua en español que quiera una experiencia limpia, organizada y con seguimiento personalizado.

---

## Para reclutadores técnicos

### Stack tecnológico

| Capa | Tecnología |
|---|---|
| **Frontend** | React 19, TypeScript 5.9, Vite 7, Tailwind CSS 4, shadcn/ui, Zustand, React Router 7 |
| **Backend** | Node.js 20, Express 5, JavaScript (ESM) |
| **Base de datos** | PostgreSQL con Prisma ORM 6 |
| **Autenticación** | JWT con refresh token rotation (bcryptjs + jsonwebtoken) |
| **Notificaciones** | Web Push API con VAPID |
| **Scraping** | Axios + node-cron (automático cada hora) |
| **Infraestructura** | Docker + Docker Compose, Nginx, Cloudflare Tunnel |
| **Calidad** | ESLint + typescript-eslint |

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
- **Backend**: API REST modular (auth, manga, favorites, reads, notifications). Cada módulo sigue el patrón Controller → Service → Prisma.
- **Base de datos**: PostgreSQL con 11 modelos (User, Series, Chapter, Page, Genre, Provider, ProviderSeries, ProviderChapter, UserFavorite, UserChapterRead, PushSubscription, RefreshToken, SeriesAlias, SeriesGenre).
- **Scrapers**: Dos proveedores (Olympuscope, ManhwaWeb) con extracción independiente. Un cron job ejecuta la recolección cada hora. Las series se deduplican entre proveedores mediante un algoritmo de matching por tokens.

### Principales decisiones técnicas

- **Refresh token rotation**: Cada vez que se renueva un token, el anterior se revoca. Si un token revuelto se reutiliza, se invalida toda la familia de tokens (detección de robo).
- **Optional authentication**: La mayoría de endpoints de lectura funcionan sin autenticación (modo invitado), pero si el usuario está logueado se actualiza su progreso automáticamente.
- **Smart series matching**: Alias manager + tokenización para detectar si dos series de distintos proveedores son la misma, evitando duplicados.
- **PWA-ready**: Service Worker para notificaciones push y manifest.json para instalación como app.
- **Contenerización completa**: Docker Compose orquesta frontend, backend y túnel Cloudflare para despliegue inmediato.

### API endpoints principales

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/api/manga` | Optional | Listado paginado con filtros (search, status, genre, sort) |
| GET | `/api/manga/latest` | Optional | Últimas series actualizadas |
| GET | `/api/manga/genres` | No | Todos los géneros disponibles |
| GET | `/api/manga/:slug` | Optional | Detalle de serie con sus capítulos |
| GET | `/api/manga/capitulo/:slug/:chapterId/pages` | Optional | Páginas de un capítulo (valida pertenencia a la serie) |
| GET | `/api/favorites` | Sí | Favoritos del usuario con progreso |
| POST | `/api/reads/chapter/:chapterId/mark-until` | Sí | Marcar todos los capítulos hasta este como leídos |
| GET | `/api/reads/full-stats` | Sí | Estadísticas detalladas de lectura |

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

### Estructura del proyecto

```
backend/
├── prisma/schema.prisma       # Modelo de datos
├── src/
│   ├── auth/                   # Registro, login, JWT, refresh tokens
│   ├── manga/                  # Series, capítulos, scraping, scrapers
│   ├── favorite/               # Favoritos del usuario
│   ├── read/                   # Tracking de lectura y estadísticas
│   ├── notifications/          # Push notifications (web-push)
│   ├── middlewares/            # Auth middleware, error handler
│   ├── jobs/scraperCron.js     # Cron de scraping automático
│   └── config/                 # Prisma client, env, email validation

frontend/
├── src/
│   ├── pages/                  # ChapterReader, MangaDetail, MangaList, etc.
│   ├── hooks/                  # Custom hooks para datos y UI
│   ├── api/                    # Cliente Axios con interceptor JWT
│   ├── store/                  # Zustand store (auth)
│   ├── components/             # shadcn/ui, layouts, sidebar
│   └── types/                  # TypeScript interfaces compartidas
```
