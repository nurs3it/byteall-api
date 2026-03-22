# AdminJS + Docker Design

**Date:** 2026-03-22
**Project:** byteall-api
**Scope:** AdminJS panel integration + full Docker Compose setup (Phase 2)

---

## Overview

Integrate AdminJS into the existing NestJS application via `@adminjs/nestjs` and `@adminjs/prisma` adapters. The admin panel lives at `/admin` inside the same process, reusing the existing `PrismaService`. Docker Compose is extended to containerise the full stack.

---

## Tech Stack

- **Admin panel:** AdminJS 7.x via `@adminjs/nestjs`, `@adminjs/prisma`
- **Session auth:** `express-session` (in-memory store, sufficient for dev/MVP)
- **Password check:** `bcrypt` (already a dependency)
- **Containerisation:** Docker Compose v2 — `postgres`, `postgres-test`, `api`

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
| `api` | node:22-alpine (Dockerfile) | 3000 | NestJS app (API + AdminJS + Swagger) |

The `api` service depends on `postgres` with a healthcheck. Environment variables are passed via `.env` file.

**Dockerfile** (multi-stage):
1. `builder` stage — installs deps, generates Prisma client, compiles TypeScript
2. `runner` stage — copies `dist/`, `node_modules/`, `prisma/` — runs `node dist/main`

**Entrypoint:** runs `npx prisma migrate deploy` before starting the app, so migrations apply automatically on container start.

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
| password | ❌ | ❌ |

Actions: list, show, edit, delete. Create disabled (users register via API).

### OTP Codes

All fields visible (id, userId, type, expiresAt, used, attempts, createdAt). Read-only + delete. No create/edit.

### Refresh Tokens

All fields visible (id, userId, token, expiresAt, revoked, createdAt). Read-only + delete. No create/edit.

---

## Access Control

```
Role    | Users | OTP Codes | Refresh Tokens
--------|-------|-----------|---------------
admin   |  CRUD |  R + Del  |   R + Del
other   |   ❌  |     ❌    |      ❌
```

Any user from the `users` table can authenticate into AdminJS (no role restriction on login). Inside the panel, sections are hidden/shown based on `role`. A non-admin user who logs in sees an empty dashboard.

Access is enforced via AdminJS `canPerformAction()` hook in `admin.permissions.ts`.

---

## Authentication

- **Endpoint:** `/admin/login` (AdminJS built-in form)
- **Flow:** `authenticate(email, password)` → `prisma.user.findUnique({ where: { email } })` → `bcrypt.compare(password, user.password)` → returns `{ id, email, role, isVerified }` or `null`
- **Session storage:** in-memory (`express-session`, default MemoryStore)
- **Session secret:** `SESSION_SECRET` env variable

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
