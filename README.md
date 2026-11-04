# Civicpress

Modern news outlet — Angular 18 + AnalogJS SSR (public) · Angular SPA (admin) · NestJS + Prisma (backend).

## Quick start

**Prerequisites:** Node 20+, pnpm 9+, PostgreSQL 14+.

```bash
# 1. Install dependencies
pnpm install

# 2. Start everything (backend + public + admin)
./start.sh
```

That's it. The script detects Postgres, runs any pending migrations, and starts all three services with live log tailing.

| App     | URL                   | Description                                     |
| ------- | --------------------- | ----------------------------------------------- |
| Public  | http://localhost:4200 | News site (AnalogJS SSR — server-side rendered) |
| Admin   | http://localhost:4300 | Admin panel (Angular SPA)                       |
| Backend | http://localhost:3000 | REST API (NestJS)                               |

### First run (seed the database)

The first time you run the project, seed it with ~30 real articles from civicpress.ro and the 3 dev user accounts:

```bash
./start.sh --seed
```

The `--seed` flag downloads articles, images, and site settings from the live site before starting the servers.

### Dev credentials (created by seed)

| Email                      | Password     | Role         |
| -------------------------- | ------------ | ------------ |
| `admin@civicpress.ro`      | `civicpress` | ADMIN        |
| `editor-sef@civicpress.ro` | `civicpress` | CHIEF_EDITOR |
| `editor@civicpress.ro`     | `civicpress` | EDITOR       |
| `author@civicpress.ro`     | `civicpress` | AUTHOR       |

> **Note:** Change these before deploying to production!

---

## Manual workflow (without start.sh)

```bash
# Copy env files
cp .env.example apps/backend/.env
cp apps/backend/.env apps/public/.env
cp apps/backend/.env apps/admin/.env

# Run DB migrations
pnpm db:migrate

# Seed content
pnpm seed

# Start all apps
pnpm dev
```

## Project structure

```
apps/
  public/    — Angular 18 + AnalogJS (SSR) — news site
    src/app/
      pages/
        (layout).page.ts      — Root layout (top-bar, logo, menu, footer)
        (layout).server.ts    — Loads /v1/settings/public + /v1/menu SSR
        (layout)/
          index.page.ts       — Home page (/) — renders the configured module layout
          index.server.ts     — Loads /v1/home SSR (resolved modules + sidebar)
          [slug].page.ts      — Article page (/:slug) with optional second column
          [slug].server.ts    — Loads /v1/posts/:slug SSR
          category/
            [slug].page.ts    — Category page (/category/:slug)
            [slug].server.ts  — Loads /v1/categories/:slug SSR (modules on page 1)
      components/modules/     — Layout module renderer (hero, hero-list, grid, list, sidebar)
      layout/
        templates/
          cat-list.component.ts       — Category page (modules on page 1, plain list after)
  admin/     — Angular 18 (Vite) — admin panel
    src/app/
      pages/
        login.component.ts    — Login form with cookie-based JWT auth
        dashboard.component.ts — Dashboard KPIs + recent audit log
        posts/
          posts-list.component.ts — Post list with status filter + workflow actions
          post-edit.component.ts  — Create/edit post + hero upload + workflow panel
        audit.component.ts    — Full audit log paginated view
      layout/
        admin-shell.component.ts — Shell (sidebar, toast container)
      services/
        auth.store.ts         — Signal-based auth state + login/logout
        api.service.ts        — Admin API calls
        toast.service.ts      — Global toast notifications
      guards/
        auth.guard.ts         — JWT auth guard (redirects to /login)
  backend/   — NestJS + Fastify + Prisma
    src/modules/
      auth/       — POST /v1/auth/login, POST /v1/auth/logout, POST /v1/auth/refresh
      users/      — GET /v1/me, PATCH /v1/me, GET /v1/users, POST /v1/users/invite
      posts/      — Full CRUD + workflow transitions + revisions
      media/      — GET /v1/media/:id/:variant, POST /v1/media/upload, GET /v1/media
      audit/      — GET /v1/audit (EDITOR+)
packages/
  shared/    — Zod schemas + TS types (Role, PostStatus, PostCreate, PostUpdate, Me, AuditEntry…)
scripts/
  seed.ts          — Populates DB from civicpress.ro WP REST API + seeds dev users
  verify-visual.ts — Playwright visual smoke test (home, category, article)
e2e/
  author-publish-smoke.spec.ts — End-to-end: author creates → editor publishes → public renders
start.sh           — One-command dev stack launcher
playwright.config.ts — Playwright configuration (admin on :4300)
```

## Useful commands

```bash
./start.sh           # Start all services (auto-detects Postgres)
./start.sh --seed    # Re-seed DB + dev users, then start all services

pnpm db:migrate     # Run Prisma migrations
pnpm db:studio      # Open Prisma Studio (DB browser)
pnpm seed           # Seed content from civicpress.ro + dev users
pnpm dev            # Start all apps via concurrently (alternative to start.sh)
pnpm build          # Build all apps (emits dist/apps/public/{client,server})
pnpm lint           # Lint all apps
pnpm typecheck      # Typecheck all apps
pnpm verify:visual  # Playwright screenshot comparison (home, politica, article)
pnpm e2e            # Run Playwright e2e smoke test (requires all apps running)
```

Production start (after `pnpm build`):

```bash
node dist/apps/public/server/index.mjs
```

## Tech stack

| Layer    | Technology                                                     |
| -------- | -------------------------------------------------------------- |
| Frontend | Angular 18 + AnalogJS 1.x (Vite 6 + SSR), Tailwind CSS         |
| Admin    | Angular 18 standalone + Vite, signal-based state, Tailwind CSS |
| Backend  | NestJS 10, Fastify, Prisma 5, PostgreSQL 16                    |
| Auth     | Argon2id password hashing, JWT (httpOnly cookies), RolesGuard  |
| Shared   | Zod schemas, TypeScript 5.5                                    |
| Media    | Sharp (EXIF-stripped uploads + on-demand resizing), disk cache |
| Audit    | Interceptor-based request logging to `AuditLog` table          |
| Monorepo | pnpm workspaces                                                |

## Auth & API reference (Step 2)

### Auth endpoints

| Method | Path               | Body                   | Auth                    | Description                   |
| ------ | ------------------ | ---------------------- | ----------------------- | ----------------------------- |
| POST   | `/v1/auth/login`   | `{email, password}`    | Public                  | Login — sets httpOnly cookies |
| POST   | `/v1/auth/logout`  | —                      | JWT                     | Clear auth cookies            |
| POST   | `/v1/auth/refresh` | —                      | Public (refresh cookie) | Rotate access token           |
| GET    | `/v1/auth/me`      | —                      | JWT                     | Current user from token       |
| GET    | `/v1/me`           | —                      | JWT                     | Full me profile               |
| PATCH  | `/v1/me`           | `{displayName?, bio?}` | JWT                     | Update own profile            |

### User management (ADMIN only)

| Method | Path               | Description                    |
| ------ | ------------------ | ------------------------------ |
| GET    | `/v1/users`        | List all users                 |
| POST   | `/v1/users/invite` | Create user with temp password |

### Post write API

| Method | Path                       | Body                 | Roles | Description                      |
| ------ | -------------------------- | -------------------- | ----- | -------------------------------- |
| GET    | `/v1/posts`                | —                    | JWT   | Admin post list (scoped by role) |
| GET    | `/v1/admin/posts/:id`      | —                    | JWT   | Single post (any status)         |
| POST   | `/v1/posts`                | PostCreate           | JWT   | Create draft                     |
| PATCH  | `/v1/posts/:id`            | PostUpdate           | JWT   | Update post fields               |
| POST   | `/v1/posts/:id/transition` | `{action, message?}` | JWT   | Workflow transition              |
| DELETE | `/v1/posts/:id`            | —                    | ADMIN | Delete post                      |
| GET    | `/v1/posts/:id/revisions`  | —                    | JWT   | Post revision history            |

### Media upload

| Method | Path                   | Description                                      |
| ------ | ---------------------- | ------------------------------------------------ |
| POST   | `/v1/media/upload`     | Upload image (multipart/form-data, `file` field) |
| GET    | `/v1/media`            | Paginated media list                             |
| GET    | `/v1/media/:id/orig`   | Serve original                                   |
| GET    | `/v1/media/:id/:width` | Serve resized webp (e.g. `/v1/media/:id/500`)    |

### Audit

| Method | Path        | Auth    | Description         |
| ------ | ----------- | ------- | ------------------- |
| GET    | `/v1/audit` | EDITOR+ | Paginated audit log |

### Adding a new layout template

1. Create `apps/public/src/app/layout/templates/my-template.component.ts` with `@Input() data` and `@Input() options`.
2. Add an entry to `TEMPLATES` in `apps/public/src/app/layout/registry.ts`.
3. The page components (`index.page.ts`, `category/[slug].page.ts`) will pick it up via `resolveTemplate()`.

# civicpress
