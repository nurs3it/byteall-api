# AdminJS + Docker Design

**Date:** 2026-03-22
**Project:** byteall-api
**Scope:** AdminJS panel integration + full Docker Compose setup (Phase 2)

---

## Overview

Integrate AdminJS into the existing NestJS application via `@adminjs/nestjs` and `@adminjs/prisma` adapters. The admin panel lives at `/admin` inside the same process, reusing the existing `PrismaService`. Docker Compose is extended to containerise the full stack.

---

## Tech Stack

- **Admin panel:** `adminjs@7`, `@adminjs/nestjs@7`, `@adminjs/prisma@1` (Prisma 7.x compatible)
- **Session auth:** `express-session@1` (in-memory store, sufficient for dev/MVP)
- **Password check:** `bcrypt` (already a dependency)
- **Containerisation:** Docker Compose v2 — `postgres`, `postgres-test`, `api`

### Compatibility notes

- **`@adminjs/prisma` with driver adapters:** The project uses Prisma 7 with `@prisma/adapter-pg`. The `@adminjs/prisma` adapter calls standard Prisma Client model methods which work with driver adapters. A smoke test (list Users in the panel) must be run as the first step of implementation to confirm this before building further.
- **`@adminjs/nestjs` with NestJS 11:** Before starting implementation, verify peer dependencies. If `@adminjs/nestjs@7` does not declare NestJS 11 in its peer deps, pin to a compatible version or use `--legacy-peer-deps`.
- **Global ThrottlerGuard:** The existing `APP_GUARD` applies to all routes including `/admin/*`. The `AdminModule` must skip throttling on admin routes by applying `@SkipThrottle()` at the module/controller level, or by excluding the `/admin` path prefix in the throttler configuration.

---

## Architecture

AdminJS is registered as a NestJS module (`AdminModule`) imported into `AppModule`. It mounts on `/admin` and uses the existing `PrismaService` to connect to the database. No separate process or container is needed for the panel.

```
src/admin/
  admin.module.ts          — registers AdminJS via @adminjs/nestjs
  admin.auth.ts            — authenticate(email, password) → session user
  admin.permissions.ts     — canPerformAction() per role
```

The NestJS app continues to serve:
- REST API at `/auth/*`
- Swagger at `/api/docs` (non-production)
- AdminJS panel at `/admin`

---

## Docker Compose

Three services:

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| `postgres` | postgres:16-alpine | 5432 | Main development database |
| `postgres-test` | postgres:16-alpine | 5433 | E2E test database |
| `api` | built from `Dockerfile` | 3000 | NestJS app (API + AdminJS + Swagger) |

The `api` service:
- Depends on `postgres` with a healthcheck (`pg_isready`)
- Reads environment from `env_file: .env`
- Exposes port 3000

**Dockerfile** (multi-stage):

```dockerfile
# Stage 1: builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 2: runner
FROM node:22-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
```

**`docker-entrypoint.sh`:**
```sh
#!/bin/sh
set -e
npx prisma migrate deploy
exec node dist/main
```

This runs `prisma migrate deploy` on every container start, then starts the app.

`.dockerignore` excludes: `node_modules`, `dist`, `.env`, `.env.test`, `test/`.

---

## AdminJS Sections

### Users

| Field | Visible | Editable |
|-------|---------|----------|
| id | ✅ | ❌ |
| email | ✅ | ❌ |
| phone | ✅ | ❌ |
| role | ✅ | ✅ |
| isVerified | ✅ | ✅ |
| createdAt | ✅ | ❌ |
| updatedAt | ✅ | ❌ |
| password | ❌ | ❌ |

Actions: list, show, edit, delete. **Create is disabled** (users register via API).

Access matrix label for Users is `R/Edit/Del` (not full CRUD — no Create).

### OTP Codes

Fields visible: `id`, `userId`, `type`, `expiresAt`, `used`, `attempts`, `createdAt`.
Hidden: `codeHash` (hashed secret — never displayed).
Actions: list, show, delete. No create/edit.

### Refresh Tokens

Fields visible: `id`, `userId`, `token`, `expiresAt`, `revoked`, `createdAt`.
Actions: list, show, delete. No create/edit.

---

## Access Control

```
Role    | Users         | OTP Codes | Refresh Tokens
--------|---------------|-----------|---------------
admin   | R/Edit/Del    | R + Del   | R + Del
other   |      ❌       |     ❌    |      ❌
```

Any user from the `users` table can authenticate into AdminJS (no role restriction at login). Inside the panel, sections are hidden/shown based on `role`. A non-admin user who logs in sees an empty dashboard with no navigation items.

Access is enforced via AdminJS `canPerformAction()` hook in `admin.permissions.ts`.

---

## Authentication

- **Endpoint:** `/admin/login` (AdminJS built-in session form)
- **Flow:** `authenticate(email, password)`:
  1. `prisma.user.findUnique({ where: { email } })`
  2. If not found or `email` is null → return `null` (phone-only users cannot log in to AdminJS; they must have an email)
  3. `bcrypt.compare(password, user.password)`
  4. If valid → return `{ id, email, role, isVerified }`; else → return `null`
- **Phone-only users:** Cannot log into AdminJS (email is required for session login). This is an accepted limitation — admin accounts should always have an email.
- **Session storage:** in-memory (`express-session` default MemoryStore — sessions are lost on restart, acceptable for dev/MVP)
- **Session secret:** `SESSION_SECRET` env variable
- **Session middleware:** registered via `app.use(session(...))` in `main.ts` before AdminJS mounts

---

## Environment Variables (additions)

```env
SESSION_SECRET=<long-random-string>
```

All existing variables remain unchanged. `.env.example` updated.

---

## Out of Scope (Phase 2)

- Persistent session store (Redis / pg)
- Custom AdminJS dashboard widgets
- Content management sections (future phases)
- Role-specific partial access within a section (e.g. user sees own record only)
- Admin audit log
- Phone-based login to AdminJS
