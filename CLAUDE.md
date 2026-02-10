# CLAUDE.md — Tracklnd

## Project Overview

Tracklnd is a track and field media platform that provides live meet coverage, athlete profiles, editorial content, prize purse systems, and community engagement. It is a React single-page application backed by Supabase (PostgreSQL + Auth + Edge Functions).

## Tech Stack

- **Frontend**: React 18, TypeScript 5.8, Vite 5.4 (SWC plugin)
- **Styling**: Tailwind CSS 3.4 with CSS variables (HSL-based color system)
- **UI Components**: shadcn-ui (Radix UI primitives) — config in `components.json`
- **Routing**: React Router DOM 6 with lazy loading
- **State**: React Query (TanStack) for server state, React Context for auth
- **Forms**: React Hook Form + Zod validation
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Payments**: Square SDK integration
- **Video**: Mux Player React
- **Rich Text**: TipTap editor
- **Testing**: Vitest + React Testing Library + jsdom

## Commands

```bash
npm run dev          # Start dev server on port 8080
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # ESLint (flat config, TS + React)
npm run test         # Run tests once (vitest run)
npm run test:watch   # Run tests in watch mode (vitest)
```

## Project Structure

```
src/
├── App.tsx                      # Root router — all routes defined here
├── main.tsx                     # Entry point
├── index.css                    # Global styles + Tailwind + CSS variables
├── pages/
│   ├── public/                  # Public-facing pages (HomePage, MeetsPage, etc.)
│   └── dashboard/               # Admin dashboard pages (MeetsTab, ContentTab, etc.)
├── components/
│   ├── ui/                      # shadcn-ui primitives (do not edit manually)
│   ├── dashboard/               # Admin CRUD dialogs and editors
│   ├── prize-purse/             # Prize purse display and admin components
│   ├── broadcast/               # Live broadcast sidebar and lineup
│   └── rankings/                # Rankings list component
├── layouts/
│   ├── PublicLayout.tsx          # Public page wrapper (nav, footer)
│   └── DashboardLayout.tsx      # Admin sidebar layout
├── contexts/
│   └── AuthContext.tsx           # Auth state, useAuth() hook
├── hooks/                       # Custom hooks (usePursePolling, useSquarePayment, etc.)
├── integrations/supabase/
│   ├── client.ts                # Supabase client singleton (auto-generated)
│   └── types.ts                 # Auto-generated DB types from Supabase schema
├── services/
│   └── rankings.ts              # Rankings business logic
├── lib/
│   ├── utils.ts                 # cn() classname merge utility
│   └── supabase-fetch.ts        # fetchWithRetry + withTimeout helpers
├── assets/                      # Static images (meets, works)
└── test/
    ├── setup.ts                 # Test setup (jest-dom matchers, matchMedia mock)
    └── example.test.ts          # Example test
supabase/
├── config.toml                  # Supabase project config + edge function settings
├── functions/                   # Deno edge functions
│   ├── process-square-payment/  # Square card payment processing
│   ├── process-refund/          # Refund handling
│   ├── finalize-purse/          # Prize purse distribution
│   └── mux-assets/              # Mux video asset management
└── migrations/                  # PostgreSQL migration files
```

## Architecture & Patterns

### Routing

All routes are defined in `src/App.tsx`. The HomePage is eagerly loaded; all other pages use `React.lazy()` with a shared `<Suspense>` fallback. Routes are organized into:

- **Standalone**: `/meets/:slug/watch` (broadcast), `/meet/:meetId/prize-purse`
- **Public** (with `PublicLayout`): `/`, `/meets`, `/meets/:slug`, `/works`, `/works/:slug`, `/account`
- **Auth** (no layout): `/login`, `/signup`
- **Dashboard** (with `DashboardLayout`, protected): `/dashboard/*`

Access control uses `<ProtectedRoute>` (authenticated users) and `<AdminRoute>` (admin role required).

### Authentication

- `AuthContext` (`src/contexts/AuthContext.tsx`) provides `useAuth()` hook
- Returns: `user`, `profile`, `isAdmin`, `isAuthenticated`, `loading`, `login`, `signup`, `logout`
- Admin status is determined by querying the `user_roles` table for `role = 'admin'`
- Supabase JWT is persisted in `localStorage`

### Data Fetching

- Use **React Query** (`@tanstack/react-query`) for all Supabase data fetching
- Import the Supabase client from `@/integrations/supabase/client`
- Use `fetchWithRetry()` from `@/lib/supabase-fetch.ts` for resilient fetches
- Real-time updates use polling (e.g., `usePursePolling` polls every 3s)

### Forms

- Use **React Hook Form** with `zodResolver` for schema validation
- CRUD operations use dialog components (e.g., `MeetFormDialog`, `EventFormDialog`)

### Styling

- All styling via **Tailwind CSS** utility classes
- Use `cn()` from `@/lib/utils` to merge conditional classnames
- Color system uses HSL CSS variables defined in `src/index.css`
- Custom fonts: Barlow (sans), Barlow Condensed (display), JetBrains Mono (mono)
- Dark mode supported via Tailwind `class` strategy

### Components

- `src/components/ui/` — shadcn-ui primitives. These are generated/managed by shadcn CLI. Avoid manual edits.
- Feature components live in domain-specific subdirectories (`dashboard/`, `prize-purse/`, `broadcast/`)
- Page components live in `src/pages/` organized by `public/` and `dashboard/`

## Database

PostgreSQL via Supabase. Key tables:

| Table | Purpose |
|---|---|
| `profiles` | User profiles (display_name, avatar_url) |
| `user_roles` | Role assignments (admin, viewer) |
| `meets` | Track meets (name, slug, status, dates, location) |
| `events` | Meet events — e.g., "Men's 100m" (linked to meets) |
| `athletes` | Athlete records (full_name, country_code, team) |
| `event_entries` | Race results (athlete_id, place, result, is_pb) |
| `works` | Articles/shorts/stories (title, slug, body, work_type, status) |
| `banners` | Homepage and meet banners |
| `broadcasts` | Mux video stream metadata |
| `prize_purse_configs` | Prize purse configuration per meet |
| `event_purse_allocations` | Event-level prize money allocations |
| `place_purse_allocations` | Place-level prize money allocations |
| `purse_snapshots` | Cached real-time purse totals |
| `event_rankings` | User prediction rankings |

Row-Level Security (RLS) is enabled. Public reads are allowed for published content; writes require admin role.

## Supabase Edge Functions

Located in `supabase/functions/`, written in Deno/TypeScript:

- `process-square-payment` — Handles Square card tokenization and payment
- `process-refund` — Processes refunds
- `finalize-purse` — Distributes prize money to event winners
- `mux-assets` — Manages Mux video assets

All functions have `verify_jwt = false` in `supabase/config.toml`.

## Environment Variables

Frontend variables (exposed via `VITE_` prefix):

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anonymous/public key |
| `VITE_SQUARE_APPLICATION_ID` | Square payment app ID (optional) |
| `VITE_SQUARE_LOCATION_ID` | Square location ID (optional) |
| `VITE_SQUARE_ENVIRONMENT` | Square env: sandbox or production (optional) |

## TypeScript Configuration

- Path alias: `@/*` maps to `./src/*`
- Strict mode is **off** (`strict: false`, `noImplicitAny: false`, `strictNullChecks: false`)
- `skipLibCheck: true`
- Target: ES2020, module: ESNext, JSX: react-jsx

## Linting

ESLint flat config (`eslint.config.js`):
- Extends: `@eslint/js` recommended + `typescript-eslint` recommended
- Plugins: `react-hooks`, `react-refresh`
- `@typescript-eslint/no-unused-vars` is **off**
- `react-refresh/only-export-components` is **warn** (allows constant exports)

## Testing

- Framework: **Vitest** with jsdom environment
- Setup: `src/test/setup.ts` (imports `@testing-library/jest-dom`, mocks `matchMedia`)
- Test files: `src/**/*.{test,spec}.{ts,tsx}`
- Globals enabled (no need to import `describe`, `it`, `expect` from vitest)
- Run: `npm run test` (single run) or `npm run test:watch`

## Build & Performance

- Vite with SWC for fast compilation
- Manual chunk splitting in `vite.config.ts` for optimized bundles:
  - `vendor-react`, `vendor-supabase`, `vendor-ui`, `vendor-editor`, `vendor-charts`, `vendor-video`
- All pages except HomePage are lazy-loaded
- Dev server runs on port 8080 with HMR (overlay disabled)

## Conventions for AI Assistants

1. **Imports**: Use the `@/` path alias for all src imports (e.g., `@/components/ui/button`)
2. **Supabase client**: Always import from `@/integrations/supabase/client` — never create new clients
3. **Supabase types**: Auto-generated in `@/integrations/supabase/types.ts` — do not edit manually
4. **UI components**: Use existing shadcn-ui components from `@/components/ui/`. Add new ones via the shadcn CLI, not by hand
5. **Classnames**: Use `cn()` from `@/lib/utils` for conditional Tailwind classes
6. **Data fetching**: Use React Query hooks wrapping Supabase calls. Follow existing patterns in page components
7. **Auth checks**: Use `useAuth()` from `@/contexts/AuthContext` — never call Supabase auth directly in components
8. **New pages**: Add routes in `src/App.tsx`, use lazy loading, place in `pages/public/` or `pages/dashboard/`
9. **New components**: Place in the appropriate domain subdirectory under `components/`
10. **Forms**: Use React Hook Form + Zod. Follow existing dialog patterns (e.g., `MeetFormDialog`)
11. **Database changes**: Create new migration files in `supabase/migrations/`
12. **Edge functions**: Place in `supabase/functions/<function-name>/index.ts`, register in `supabase/config.toml`
13. **No strict types**: The codebase does not use strict TypeScript — avoid adding strict null checks or implicit-any errors
14. **Testing**: Place test files alongside source or in `src/test/`. Use vitest globals. Run `npm run test` to verify
