# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Monorepo (npm workspaces) with two applications:
- **API** (root) — NestJS 11 backend, TypeScript 5.7, Prisma 7 + PostgreSQL
- **Admin** (`packages/admin/`) — React 18 + Vite + Refine + Ant Design admin panel

## Common Commands

```bash
# API development
npm run start:dev          # NestJS watch mode (port 3000)
npm run build              # Compile to dist/

# Admin development
npm run dev -w @byteall/admin   # Vite dev server (port 3001, proxies /api → :3000)
npm run build -w @byteall/admin

# Testing
npm run test               # Unit tests (jest, src/**/*.spec.ts)
npm run test -- --testPathPattern=users  # Run single test file/module
npm run test:e2e           # E2E tests (requires DATABASE_TEST_URL in .env.test)

# Code quality
npm run lint               # ESLint with --fix
npm run format             # Prettier

# Database
npx prisma migrate dev     # Create/apply migration in dev
npx prisma migrate deploy  # Apply migrations (production)
npx prisma generate        # Regenerate Prisma client

# Docker
docker compose up          # All services: postgres, postgres-test, api, admin
```

## Architecture

### Backend Layering (3-tier, strictly enforced)

```
Controller → Service → Repository → PrismaService
```

No raw Prisma calls in controllers or services — all DB access goes through repository classes.

### Split Controllers Pattern

Modules with both public and admin routes use separate controllers:
- `PostsController` — public/authenticated user routes
- `PostsAdminController` — `/posts/admin` routes requiring `admin` role

**Important**: Admin controller must be listed **first** in module's `controllers` array to prevent `:slug` param from swallowing `/admin`.

### Global Response Wrapping

- **Success**: All responses wrapped in `{ data: ..., message: 'success' }` by `ResponseInterceptor`
- **Errors**: Normalized to `{ statusCode, message, error }` by `HttpExceptionFilter`
- Admin panel's `dataProvider` unwraps this format automatically

### Pagination Convention

API uses `?_start=&_end=` query params (Refine-compatible), returns total count in `X-Total-Count` header.

### Authentication

- JWT access token (15m) + opaque UUID refresh token (30d) in DB
- `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(UserRole.admin)` for admin routes
- `@CurrentUser()` param decorator extracts authenticated user
- OTP codes: bcrypt-hashed, 10min expiry, 3 attempts max, 60s resend cooldown

### Rate Limiting

Global throttler: 5 req/60s. Use `@SkipThrottle()` on public read endpoints, `@Throttle()` for custom limits.

### File Uploads

Supabase Storage via `UploadsService`. Requires `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` env vars (not in `.env.example` — add manually).

## Key Config

- Prisma uses driver-adapter approach (`@prisma/adapter-pg` with `PrismaPg`)
- Config file: `prisma.config.ts` (Prisma v7 `defineConfig`)
- Admin installs use `--legacy-peer-deps` (Tiptap v2/v3 conflicts)
- Vite aliases force `@tiptap/*` to resolve from `packages/admin/node_modules`
- `PrismaModule` is `@Global()` — no need to import in other modules
- Jest `testTimeout: 30000` (bcrypt is slow)
- Swagger at `/api/docs` (non-production only)
