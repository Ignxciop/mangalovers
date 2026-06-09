# Frontend Conventions

## Stack
- React 19, TypeScript 5.9, Vite 7, Tailwind 4, shadcn/ui, Zustand, React Router 7.

## Path aliases
- `@/` → `src/` (configured in tsconfig + vite resolve).

## State management
- Zustand with `persist` in localStorage under key `mangalovers-auth`.

## API layer
- Axios instance in `src/api/axios.ts`.
- Interceptor refreshes JWT silently (queue with dedup).
- Module-specific API files: `admin.ts`, `friends.ts`, `manga.ts`, `reads.ts`, `favorites.ts`, `notifications.ts`.

## shadcn/ui
- Components in `src/components/ui/`.
- Config in `components.json`.
- `cn()` utility in `@/lib/utils` for combining Tailwind classes.

## Project structure
- Pages in `pages/` (one file per route, some complex ones like `adminTools.tsx` compose sections).
- Hooks in `hooks/`: `useMangaList`, `useAuth`, `useAutoFetch`, `useAutoFetchStatic`, `useChapterPages`, `useReadingProgress`, `useFriends`, `useFriendSeriesReads`, `useSidebar`, `useDebounce`.
- Shared types in `types/manga.ts`, admin types in `types/admin.ts`, friends in `types/friends.ts`.
- Components in `components/`: reusable UI like `chapterImage.tsx`, `coverImage.tsx`, `pageContent.tsx`, `paginationControls.tsx`, `avatar.tsx`, `friendSeriesReadSection.tsx`, `seoHelmet.tsx`, `secondaryNavbar.tsx`.

## Image loading patterns
- **chapterImage.tsx** (lector): IntersectionObserver lazy loading (`rootMargin="400px"`). `MAX_RETRIES=1`, `TIMEOUT_MS=8000`, `MIN_IMAGE_SIZE=100` (placeholder detection via `naturalWidth/Height`). On error: tries `fallback` provider URL, then `cascade` sibiling, then broken image fallback.
- **coverImage.tsx** (portadas): `MAX_RETRIES=1`, `TIMEOUT_MS=5000`, `MIN_IMAGE_SIZE=100`. Timeout applies even in priority mode. On error: tries same-page alternatives, then fallback provider, then placeholder.
- **chapterReader.tsx**: `activePages` uses `chapter.fallbackPages` by default when available (transparent to user). No banner, no manual provider switch button. Removed `followingFallback` state. User never sees provider internals.
- All images: no inline `loading="lazy"` on chapter images (IntersectionObserver replaces it). Cover images use IntersectionObserver too.

## Admin pages
- `/admin/herramientas` (`adminTools.tsx`): per-provider run/stop buttons, auto-scraper toggle, provider checkboxes, MissingPagesSection with refill.
- Common layout: `min-h-screen bg-background flex flex-col overflow-x-hidden` (root), `container mx-auto px-4 py-4 flex-1 flex flex-col min-h-0` (`<main>`).
- Sidebar with icons: User (users), BarChart3 (metrics), Lightbulb (suggestions), Activity (activity), ScrollText (audit), Wrench (tools).

## Build
- `pnpm build` runs `tsc -b && vite build`.
- No standalone `pnpm typecheck` — `tsc -b` is part of build.

## Service Worker
- `public/sw.js` only handles push notifications. No offline cache.

## Scripts
- Maintenance scripts in `backend/src/scripts/`.
