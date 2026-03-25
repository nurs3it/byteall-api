# Docker Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить `admin` сервис в `docker-compose.yml` — nginx раздаёт собранный Vite bundle и проксирует `/api/` на NestJS API контейнер.

**Architecture:** Многоэтапный `Dockerfile` в `packages/admin/` собирает Vite в статику, nginx раздаёт её на порту 80. nginx проксирует `/api/*` → `http://api:3000/` внутри Docker сети, что устраняет CORS между контейнерами. API использует Supabase DATABASE_URL из `.env`.

**Tech Stack:** Docker, nginx, Vite build, docker-compose

---

## Файловая структура

```
packages/admin/
  Dockerfile          — новый: multi-stage build (node builder + nginx runner)
  nginx.conf          — новый: nginx конфиг со статикой и /api proxy

docker-compose.yml    — изменить: добавить admin сервис
```

---

## Task 1: Dockerfile для packages/admin

**Files:**
- Create: `packages/admin/Dockerfile`
- Create: `packages/admin/.dockerignore`

- [ ] **Step 1: Создать `packages/admin/.dockerignore`**

Без этого файла Docker включит локальный `node_modules` в build context, что раздует его и сломает бинарники.

```
node_modules
dist
.env
```

- [ ] **Step 2: Создать `packages/admin/Dockerfile`**

```dockerfile
# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

- [ ] **Step 3: Проверить что файлы созданы**

```bash
ls packages/admin/Dockerfile packages/admin/.dockerignore
```

Ожидаемый результат: оба файла существуют.

- [ ] **Step 4: Commit**

```bash
git add packages/admin/Dockerfile packages/admin/.dockerignore
git commit -m "feat(admin): add multi-stage Dockerfile with nginx"
```

---

## Task 2: nginx конфиг

**Files:**
- Create: `packages/admin/nginx.conf`

- [ ] **Step 1: Создать `packages/admin/nginx.conf`**

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Redirect bare /api to /api/ so proxy_pass works correctly
    location = /api {
        return 301 /api/;
    }

    # Proxy /api/* to NestJS API container (strips /api/ prefix)
    location /api/ {
        proxy_pass http://api:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # SPA fallback — all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/admin/nginx.conf
git commit -m "feat(admin): add nginx config with API proxy and SPA fallback"
```

---

## Task 3: Добавить admin сервис в docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Прочитать текущий `docker-compose.yml`**

Убедиться что структура файла понятна перед изменением.

- [ ] **Step 2: Добавить `admin` сервис в `docker-compose.yml`**

Итоговый файл должен выглядеть так:

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
    restart: unless-stopped

  admin:
    build:
      context: ./packages/admin
      dockerfile: Dockerfile
    ports:
      - '8080:80'
    depends_on:
      - api
    restart: unless-stopped

volumes:
  pgdata:
```

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add admin service to docker-compose with nginx"
```

---

## Task 4: Проверить сборку

- [ ] **Step 1: Собрать только admin образ**

```bash
docker compose build admin 2>&1
```

Ожидаемый результат: `Successfully built` без ошибок.

- [ ] **Step 2: Запустить все сервисы**

```bash
docker compose up -d api admin 2>&1
```

> **Примечание:** `postgres` сервис не нужен если API подключён к Supabase. Если `.env` содержит Supabase `DATABASE_URL` — запускать только `api` и `admin`.

- [ ] **Step 3: Проверить что сервисы запущены**

```bash
docker compose ps
```

Ожидаемый результат: `api` и `admin` в статусе `running`.

- [ ] **Step 4: Проверить admin панель**

Открыть `http://localhost:8080` — должна отобразиться страница логина ByteAll Admin.

- [ ] **Step 5: Проверить API прокси**

```bash
curl -s http://localhost:8080/api/auth/me 2>&1
```

Ожидаемый результат: JSON ответ (401 Unauthorized — это нормально, значит прокси работает).

- [ ] **Step 6: Commit если всё работает**

```bash
git add .
git commit -m "chore: verify docker compose with admin panel"
```

---

## Итог

После выполнения всех задач:
- `docker compose up -d api admin` — запускает API на `:3000` и admin панель на `:8080`
- `http://localhost:8080` — admin панель
- `http://localhost:8080/api/*` — проксируется на API
- `http://localhost:3000` — API напрямую
