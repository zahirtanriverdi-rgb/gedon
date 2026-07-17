# GedəkGörək — Next.js frontend (`web/`)

Next.js (App Router) frontend, migrated from the old Vite SPA. It renders the SEO-critical
public pages **server-side** and talks to the **unchanged** Express API (repo root `server.ts`).

## Topology

```
Browser ──▶ Next.js (this app, :3001)
                │  server components fetch API_BASE_URL directly (SSR)
                │  /api/* browser calls are rewritten to the API origin (next.config.ts)
                ▼
            Express API (repo root, :3000) ── unchanged
```

The Express backend is **not** modified by this migration. It keeps serving `/api/*` (and
uploaded images). Its old job of serving the SPA is simply no longer used.

## Local development

1. Start the API from the repo root (defaults to port 3000):
   ```bash
   cd ..            # repo root
   npm run dev      # tsx server.ts  → http://localhost:3000
   ```
2. Start this app (port 3001):
   ```bash
   cd web
   npm install
   cp .env.example .env.local   # already present; points at http://localhost:3000
   npm run dev                  # → http://localhost:3001
   ```

## Environment variables

See `.env.example`. Key ones:

| Var | Used by | Purpose |
| --- | --- | --- |
| `API_BASE_URL` | server components + rewrites | Express API origin (may be internal in prod) |
| `NEXT_PUBLIC_API_BASE_URL` | browser | API origin for absolute client calls (usually same) |
| `NEXT_PUBLIC_SITE_URL` | metadata | This app's public origin — canonical / OG / JSON-LD |
| `NEXT_PUBLIC_IMAGE_HOSTS` | `next/image` | comma-separated https image hosts (CDN/staging) |
| `NEXT_PUBLIC_GOOGLE_MAPS_PLATFORM_KEY` | maps loader | client Google Maps JS key |

## Staging (custom sub-domain, e.g. `gedon.xxx.xx`)

Use `.env.staging` as a template for the host's environment: set `NEXT_PUBLIC_SITE_URL` to the
sub-domain and `API_BASE_URL` / `NEXT_PUBLIC_API_BASE_URL` to the API's staging origin, then:

```bash
npm run build && npm start   # serves on :3001 (put a reverse proxy / TLS in front)
```

## Structure

```
app/
  layout.tsx              root <html> + Providers (Language, Notification)
  (site)/                 public marketing pages WITH header/footer chrome
    page.tsx              home — SSR tour list
    tours/[slug]/         SSR tour detail + generateMetadata + JSON-LD  ← core SEO win
    organizer/[id]/       SSR organizer profile
    faq | calculator | wishlist | compare | camp-sites   client pages
  vendor/                 AuthProvider + login + client dashboard (VendorPortal)
  admin/                  AuthProvider + login + client dashboard (AdminPortal)
  reset-password/         standalone
src/
  components/             ported from the old src/ (marked 'use client')
  hooks/useMarketplace.ts dashboard data + CRUD handlers (ported from old App.tsx)
  lib/api.ts              serverFetch / clientFetch helpers
  lib/auth.tsx            in-memory session context for dashboards
  i18n | utils | data | types.ts   shared, ported verbatim
```

## What is server-rendered (SEO)

`/`, `/tours/[slug]`, `/organizer/[id]` render on every request (`dynamic = 'force-dynamic'`)
with content + metadata in the initial HTML. Verify:

```bash
curl -s http://localhost:3001/tours/<slug> | grep -iE "<title>|og:title|application/ld\+json"
```
