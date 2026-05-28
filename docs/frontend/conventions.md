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

## shadcn/ui
- Components in `src/components/ui/`.
- Config in `components.json`.
- `cn()` utility in `@/lib/utils` for combining Tailwind classes.

## Project structure
- Pages in `pages/`.
- Hooks in `hooks/`.
- Shared types in `types/manga.ts`, admin types in `types/admin.ts`.

## Build
- `pnpm build` runs `tsc -b && vite build`.
- No standalone `pnpm typecheck` — `tsc -b` is part of build.

## Service Worker
- `public/sw.js` only handles push notifications. No offline cache.

## Scripts
- Maintenance scripts in `backend/src/scripts/`.
