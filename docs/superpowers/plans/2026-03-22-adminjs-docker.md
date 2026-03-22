# AdminJS + Docker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an AdminJS panel at `/admin` (session auth, role-based access to Users/OTP Codes/Refresh Tokens) and containerise the full stack with Docker Compose.

**Architecture:** AdminJS is registered as a NestJS module (`AdminModule`) inside the existing app, mounting on `/admin` and reusing `PrismaService`. Session auth uses `express-session` (in-memory). Docker Compose gets an `api` service built from a multi-stage Dockerfile; migrations run automatically on container start via `docker-entrypoint.sh`.

**Tech Stack:** `adminjs@7`, `@adminjs/nestjs@7`, `@adminjs/prisma@1`, `express-session@1`, `@types/express-session`, Docker Compose v2.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/admin/admin.module.ts` | Create | Registers AdminJS via `@adminjs/nestjs`, wires session auth and resource configs |
| `src/admin/admin.auth.ts` | Create | `authenticate(email, password)` — bcrypt check, returns session user or null |
| `src/admin/admin.permissions.ts` | Create | `canPerformAction(context)` — role-based action gating |
| `src/app.module.ts` | Modify | Import `AdminModule` |
| `src/main.ts` | Modify (if needed) | `@adminjs/nestjs` handles session internally via `sessionOptions`; only modify if package docs require external registration |
| `Dockerfile` | Create | Multi-stage build (builder + runner) |
| `docker-entrypoint.sh` | Create | `prisma migrate deploy && node dist/main` |
| `.dockerignore` | Create | Exclude `node_modules`, `dist`, `.env*`, `test/` |
| `docker-compose.yml` | Modify | Add `api` service with healthcheck dependency on `postgres` |
| `.env.example` | Modify | Add `SESSION_SECRET` |

---

## Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install AdminJS packages**

```bash
npm install adminjs @adminjs/nestjs @adminjs/prisma express-session
npm install --save-dev @types/express-session
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('adminjs'); require('@adminjs/nestjs'); require('@adminjs/prisma'); require('express-session'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 3: Check NestJS 11 peer dep compatibility**

```bash
npm ls @adminjs/nestjs 2>&1 | head -20
```

If you see peer dep warnings about `@nestjs/core`, check if `@adminjs/nestjs` lists NestJS 11 as a supported peer. If not, install with `--legacy-peer-deps` and note it.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install adminjs, @adminjs/nestjs, @adminjs/prisma, express-session"
```

---

## Task 2: Admin Auth Helper

**Files:**
- Create: `src/admin/admin.auth.ts`

- [ ] **Step 1: Create `src/admin/admin.auth.ts`**

```typescript
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminSessionUser {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
}

export async function authenticate(
  email: string,
  password: string,
  prisma: PrismaService,
): Promise<AdminSessionUser | null> {
  if (!email || !password) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.email) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/admin/admin.auth.ts
git commit -m "feat: add AdminJS session authenticate helper"
```

---

## Task 3: Admin Permissions

**Files:**
- Create: `src/admin/admin.permissions.ts`

- [ ] **Step 1: Create `src/admin/admin.permissions.ts`**

```typescript
import { ActionContext, ActionRequest } from 'adminjs';

/**
 * Returns true if the current session user can perform the requested action.
 *
 * Rules:
 * - admin: can do everything
 * - any other role: cannot do anything (all resources are hidden in navigation too)
 */
export function canPerformAction(
  context: ActionContext<ActionRequest, any>,
): boolean {
  const { currentAdmin } = context;
  if (!currentAdmin) return false;
  return currentAdmin.role === 'admin';
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/admin/admin.permissions.ts
git commit -m "feat: add AdminJS canPerformAction permission helper"
```

---

## Task 4: AdminModule

**Files:**
- Create: `src/admin/admin.module.ts`
- Modify: `src/app.module.ts`

AdminJS resources are configured here. The `@adminjs/prisma` adapter receives the Prisma client and the Prisma DMMF to generate resource configs.

> **Note on `main.ts`:** `@adminjs/nestjs` registers `express-session` middleware internally when you pass `sessionOptions` to `createAdminAsync`. You do **not** need to call `app.use(session(...))` in `main.ts`. The file structure table lists `main.ts` as modified — that modification is not needed unless your version of `@adminjs/nestjs` explicitly requires it (check the package docs after install).

- [ ] **Step 1: Create `src/admin/admin.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { AdminModule as AdminJSModule } from '@adminjs/nestjs';
import * as AdminJS from 'adminjs';
import { PrismaClient } from '@prisma/client';
import { Database, Resource, getModelByName } from '@adminjs/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { authenticate } from './admin.auth';
import { canPerformAction } from './admin.permissions';

AdminJS.AdminJS.registerAdapter({ Database, Resource });

@Module({
  imports: [
    AdminJSModule.createAdminAsync({
      useFactory: async (prisma: PrismaService) => {
        // @adminjs/prisma needs the Prisma DMMF (data model metadata).
        // With Prisma 7 driver adapters, _dmmf may be undefined — use getDMMF as a fallback.
        let dmmf = (prisma as any)._dmmf;
        if (!dmmf) {
          const { getDMMF } = await import('@prisma/internals');
          dmmf = await getDMMF({ datamodelPath: 'prisma/schema.prisma' });
        }

        return {
          adminJsOptions: {
            rootPath: '/admin',
            resources: [
              {
                resource: { model: getModelByName('User', dmmf), client: prisma as unknown as PrismaClient },
                options: {
                  navigation: { name: 'User Management' },
                  properties: {
                    password: { isVisible: false },
                    codeHash: { isVisible: false },
                    id: { isEditable: false },
                    email: { isEditable: false },
                    phone: { isEditable: false },
                    createdAt: { isEditable: false },
                    updatedAt: { isEditable: false },
                  },
                  actions: {
                    new: { isAccessible: false },
                    list: { isAccessible: canPerformAction },
                    show: { isAccessible: canPerformAction },
                    edit: { isAccessible: canPerformAction },
                    delete: { isAccessible: canPerformAction },
                  },
                },
              },
              {
                resource: { model: getModelByName('OtpCode', dmmf), client: prisma as unknown as PrismaClient },
                options: {
                  navigation: { name: 'Auth' },
                  properties: {
                    codeHash: { isVisible: false },
                  },
                  actions: {
                    new: { isAccessible: false },
                    edit: { isAccessible: false },
                    list: { isAccessible: canPerformAction },
                    show: { isAccessible: canPerformAction },
                    delete: { isAccessible: canPerformAction },
                  },
                },
              },
              {
                resource: { model: getModelByName('RefreshToken', dmmf), client: prisma as unknown as PrismaClient },
                options: {
                  navigation: { name: 'Auth' },
                  actions: {
                    new: { isAccessible: false },
                    edit: { isAccessible: false },
                    list: { isAccessible: canPerformAction },
                    show: { isAccessible: canPerformAction },
                    delete: { isAccessible: canPerformAction },
                  },
                },
              },
            ],
          },
          auth: {
            authenticate: (email: string, password: string) =>
              authenticate(email, password, prisma),
            cookieName: 'adminjs',
            cookiePassword: process.env.SESSION_SECRET ?? 'fallback-secret-change-me',
          },
          sessionOptions: {
            resave: false,
            saveUninitialized: false,
            secret: process.env.SESSION_SECRET ?? 'fallback-secret-change-me',
          },
        };
      },
      inject: [PrismaService],
      imports: [PrismaModule],   // required to make PrismaService injectable in the factory
    }),
  ],
})
export class AdminModule {}
```

- [ ] **Step 2: Add `AdminModule` to `AppModule`**

In `src/app.module.ts`, add the import:

```typescript
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]),
    PrismaModule,
    AuthModule,
    AdminModule,   // ← add this
  ],
  ...
})
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

If you see type errors with `getModelByName` or `_dmmf`, it means the `@adminjs/prisma` API differs from what's above. Check `node_modules/@adminjs/prisma/src/index.ts` for the actual exported names, then adjust accordingly. Common alternative:

```typescript
import { getPrismaModelByName } from '@adminjs/prisma';
// or
import { buildResource } from '@adminjs/prisma';
```

Adapt imports to match the actual package API.

- [ ] **Step 4: Smoke test — start the app locally**

```bash
SESSION_SECRET=dev-secret npm run start:dev
```

Open `http://localhost:3000/admin` — you should see the AdminJS login page.
Log in with a user that has `role: admin` in your dev database.
Verify the three sections (User Management, OTP Codes, Refresh Tokens) appear in the sidebar.

If the app crashes with `_dmmf is undefined`, the Prisma driver adapter pattern requires a different approach. In that case replace the `_dmmf` usage with:

```typescript
import { getDMMF } from '@prisma/internals';
const dmmf = await getDMMF({ datamodelPath: 'prisma/schema.prisma' });
```

And make the `useFactory` async.

- [ ] **Step 5: Commit**

```bash
git add src/admin/ src/app.module.ts
git commit -m "feat: add AdminModule with AdminJS panel at /admin"
```

---

## Task 5: Throttler Exclusion for /admin

The global `ThrottlerGuard` (registered as `APP_GUARD`) rate-limits all routes including AdminJS. With a 5 req/min limit, normal panel usage (list, filter, paginate) would trigger 429 errors immediately.

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: Exclude `/admin` from throttling**

In `src/app.module.ts`, update `ThrottlerModule.forRoot` to skip the admin path:

```typescript
ThrottlerModule.forRoot({
  throttlers: [{ ttl: 60000, limit: 5 }],
  skipIf: (context) => {
    const request = context.switchToHttp().getRequest();
    return request?.url?.startsWith('/admin');
  },
}),
```

- [ ] **Step 2: Verify unit tests still pass**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 3: Smoke test the panel**

```bash
npm run start:dev
```

Navigate the AdminJS panel (list users, filter, paginate) — no 429 errors.

- [ ] **Step 4: Commit**

```bash
git add src/app.module.ts
git commit -m "feat: exclude /admin routes from throttler rate limiting"
```

---

## Task 6: Docker Setup

**Files:**
- Create: `Dockerfile`
- Create: `docker-entrypoint.sh`
- Create: `.dockerignore`
- Modify: `docker-compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: Create `.dockerignore`**

```
node_modules
dist
.env
.env.test
test
coverage
*.md
.git
.gitignore
```

- [ ] **Step 2: Create `docker-entrypoint.sh`**

```sh
#!/bin/sh
set -e
echo "Running database migrations..."
npx prisma migrate deploy
echo "Starting application..."
exec node dist/main
```

- [ ] **Step 3: Create `Dockerfile`**

```dockerfile
# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: runner ───────────────────────────────────────────────────────────
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

- [ ] **Step 4: Update `docker-compose.yml`**

Replace the entire file with:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: byteall
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  postgres-test:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: byteall_test
    ports:
      - '5433:5432'

  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    env_file:
      - .env
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

volumes:
  pgdata:
```

- [ ] **Step 5: Add `SESSION_SECRET` to `.env.example`**

Add the following line to `.env.example`:

```env
SESSION_SECRET=<long-random-string>
```

Also add `SESSION_SECRET` to your local `.env` file (not committed):

```env
SESSION_SECRET=dev-session-secret-change-in-production
```

- [ ] **Step 6: Build and run with Docker Compose**

```bash
docker compose up --build
```

Expected:
- `postgres` starts and passes healthcheck
- `api` builds (takes ~1-2 min first time), runs migrations, starts
- `http://localhost:3000/auth/me` returns 401 (API alive)
- `http://localhost:3000/admin` returns AdminJS login page
- `http://localhost:3000/api/docs` — Swagger (if `NODE_ENV` is not `production`)

If the `api` container exits with `DATABASE_URL not set`, verify `.env` has `DATABASE_URL` and the `env_file` path is correct.

- [ ] **Step 7: Commit**

```bash
git add Dockerfile docker-entrypoint.sh .dockerignore docker-compose.yml .env.example
git commit -m "feat: add Dockerfile, docker-entrypoint, docker-compose api service"
```

---

## Task 7: Final Verification

- [ ] **Step 1: Run all unit tests**

```bash
npx jest --no-coverage
```

Expected: all pass.

- [ ] **Step 2: Full Docker Compose smoke test**

```bash
docker compose down -v
docker compose up --build -d
sleep 15
curl -s http://localhost:3000/admin | grep -q 'AdminJS' && echo "AdminJS OK" || echo "AdminJS FAIL"
curl -s http://localhost:3000/api/docs | grep -q 'swagger' && echo "Swagger OK" || echo "Swagger FAIL"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/me
```

Expected: `AdminJS OK`, `Swagger OK`, `401` from `/auth/me`.

- [ ] **Step 3: Test admin login**

Open `http://localhost:3000/admin/login`.
Log in with a user that has `role: admin`.
Verify all three sections (User Management, OTP Codes Auth, Refresh Tokens Auth) appear.
Log in with a `role: user` account — verify empty dashboard (no sections visible).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete AdminJS panel + Docker setup (Phase 2)"
```
