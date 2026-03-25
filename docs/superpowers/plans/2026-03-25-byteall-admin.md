# Byteall Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Создать admin-панель на Refine + Ant Design внутри монорепо `packages/admin`, подключённую к NestJS API через JWT.

**Architecture:** Refine приложение живёт в `packages/admin`, собирается Vite, общается с NestJS API через кастомный `dataProvider` и `authProvider`. Роли проверяются на основе поля `role` в JWT — только `admin` имеют доступ. NestJS список-эндпоинты возвращают массив напрямую и устанавливают `X-Total-Count` заголовок для пагинации Refine.

**Tech Stack:** React 18, Refine 4, Ant Design 5, Vite, TypeScript, Axios

---

## Важные факты о кодовой базе

- `UsersService` использует `UsersRepository` (не `PrismaService` напрямую) — новые admin-методы добавляются в `UsersRepository`
- `RolesGuard` и `roles.decorator` уже существуют в `src/auth/guards/` и `src/auth/decorators/` — не создавать заново
- `UsersModule` не имеет `controllers` и не импортирован в `AppModule` — нужно добавить оба
- `ResponseInterceptor` оборачивает ответы в `{ data: ..., message: 'success' }` — `dataProvider` должен это учитывать
- Для пагинации `simpleRestProvider` читает `X-Total-Count` заголовок — контроллер должен его устанавливать

---

## Файловая структура

```
packages/admin/
  src/
    providers/
      authProvider.ts       — логин, логаут, проверка роли, refresh токена
      dataProvider.ts       — кастомный axios dataProvider с поддержкой X-Total-Count
    pages/
      dashboard/
        index.tsx           — карточки статистики
      users/
        index.tsx           — реэкспорты
        list.tsx            — таблица пользователей
        show.tsx            — просмотр пользователя
        edit.tsx            — редактирование пользователя
      otp-codes/
        list.tsx            — таблица OTP кодов (read-only)
      refresh-tokens/
        list.tsx            — таблица refresh токенов (read-only)
      login/
        index.tsx           — страница логина
      forbidden/
        index.tsx           — страница 403
    App.tsx                 — роутинг, ресурсы Refine
    main.tsx                — точка входа
  index.html
  vite.config.ts
  tsconfig.json
  package.json
  .gitignore

NestJS изменения:
  src/users/users.repository.ts   — добавить findAll, findOne, updateRole, findAllOtpCodes, findAllRefreshTokens, getStats
  src/users/users.service.ts      — добавить методы-делегаты к репозиторию
  src/users/users.controller.ts   — новый контроллер с admin-only эндпоинтами, X-Total-Count заголовки
  src/users/users.module.ts       — добавить UsersController в controllers
  src/app.module.ts               — добавить UsersModule в imports
  src/main.ts                     — добавить CORS с exposedHeaders
```

---

## Task 1: Настройка монорепо и создание packages/admin

**Files:**
- Create: `packages/admin/package.json`
- Create: `packages/admin/index.html`
- Create: `packages/admin/vite.config.ts`
- Create: `packages/admin/tsconfig.json`
- Create: `packages/admin/.gitignore`
- Modify: `package.json` (root) — добавить workspaces

- [ ] **Step 1: Обновить root `package.json` — добавить workspaces**

Добавить после `"license": "UNLICENSED"`:

```json
"workspaces": ["packages/*"],
```

- [ ] **Step 2: Создать структуру папок**

```bash
mkdir -p packages/admin/src/{providers,pages/{dashboard,users,otp-codes,refresh-tokens,login,forbidden}}
```

- [ ] **Step 3: Создать `packages/admin/.gitignore`**

```
node_modules
dist
.env
```

- [ ] **Step 4: Создать `packages/admin/package.json`**

```json
{
  "name": "@byteall/admin",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@refinedev/antd": "^5.43.0",
    "@refinedev/core": "^4.54.0",
    "@refinedev/react-router-v6": "^4.6.0",
    "antd": "^5.22.0",
    "axios": "^1.7.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.7.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 5: Создать `packages/admin/vite.config.ts`**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
```

- [ ] **Step 6: Создать `packages/admin/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true
  },
  "include": ["src"]
}
```

- [ ] **Step 7: Создать `packages/admin/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ByteAll Admin</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Установить зависимости**

```bash
cd packages/admin && npm install
```

- [ ] **Step 9: Commit**

```bash
git add packages/admin/ package.json
git commit -m "chore: scaffold packages/admin monorepo with Refine + Ant Design"
```

---

## Task 2: NestJS — admin эндпоинты (Repository + Service + Controller)

**Files:**
- Modify: `src/users/users.repository.ts`
- Modify: `src/users/users.service.ts`
- Create: `src/users/users.controller.ts`
- Create: `src/users/dto/update-role.dto.ts`
- Modify: `src/users/users.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Добавить методы в `src/users/users.repository.ts`**

Добавить в конец класса `UsersRepository` (import `OtpCode, RefreshToken` уже доступны через `@prisma/client`):

```typescript
async findAllAdmin(skip: number, take: number) {
  const [data, total] = await Promise.all([
    this.prisma.user.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    this.prisma.user.count(),
  ]);
  return { data, total };
}

async findByIdAdmin(id: string) {
  return this.prisma.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async updateRole(id: string, role: UserRole) {
  return this.prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async findAllOtpCodes(skip: number, take: number) {
  const [data, total] = await Promise.all([
    this.prisma.otpCode.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, phone: true } } },
    }),
    this.prisma.otpCode.count(),
  ]);
  return { data, total };
}

async findAllRefreshTokens(skip: number, take: number) {
  const [data, total] = await Promise.all([
    this.prisma.refreshToken.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { email: true, phone: true } } },
    }),
    this.prisma.refreshToken.count(),
  ]);
  return { data, total };
}

async getStats() {
  const [totalUsers, verifiedUsers, activeTokens, otpToday] = await Promise.all([
    this.prisma.user.count(),
    this.prisma.user.count({ where: { isVerified: true } }),
    this.prisma.refreshToken.count({
      where: { revoked: false, expiresAt: { gt: new Date() } },
    }),
    this.prisma.otpCode.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
  ]);
  return { totalUsers, verifiedUsers, activeTokens, otpToday };
}
```

- [ ] **Step 2: Добавить методы-делегаты в `src/users/users.service.ts`**

Добавить в конец класса `UsersService`:

```typescript
findAllAdmin(skip: number, take: number) {
  return this.usersRepository.findAllAdmin(skip, take);
}

findByIdAdmin(id: string) {
  return this.usersRepository.findByIdAdmin(id);
}

updateRole(id: string, role: UserRole) {
  return this.usersRepository.updateRole(id, role);
}

findAllOtpCodes(skip: number, take: number) {
  return this.usersRepository.findAllOtpCodes(skip, take);
}

findAllRefreshTokens(skip: number, take: number) {
  return this.usersRepository.findAllRefreshTokens(skip, take);
}

getStats() {
  return this.usersRepository.getStats();
}
```

- [ ] **Step 3: Создать `src/users/dto/update-role.dto.ts`**

```typescript
import { IsEnum } from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
```

- [ ] **Step 4: Создать `src/users/users.controller.ts`**

```typescript
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List all users (admin only)' })
  async findAll(
    @Query('_start', new DefaultValuePipe(0), ParseIntPipe) start: number,
    @Query('_end', new DefaultValuePipe(10), ParseIntPipe) end: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const take = end - start;
    const { data, total } = await this.usersService.findAllAdmin(start, take);
    res.setHeader('X-Total-Count', total);
    return data;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard stats (admin only)' })
  getStats() {
    return this.usersService.getStats();
  }

  @Get('otp-codes')
  @ApiOperation({ summary: 'List all OTP codes (admin only)' })
  async findAllOtpCodes(
    @Query('_start', new DefaultValuePipe(0), ParseIntPipe) start: number,
    @Query('_end', new DefaultValuePipe(10), ParseIntPipe) end: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const take = end - start;
    const { data, total } = await this.usersService.findAllOtpCodes(start, take);
    res.setHeader('X-Total-Count', total);
    return data;
  }

  @Get('refresh-tokens')
  @ApiOperation({ summary: 'List all refresh tokens (admin only)' })
  async findAllRefreshTokens(
    @Query('_start', new DefaultValuePipe(0), ParseIntPipe) start: number,
    @Query('_end', new DefaultValuePipe(10), ParseIntPipe) end: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const take = end - start;
    const { data, total } = await this.usersService.findAllRefreshTokens(start, take);
    res.setHeader('X-Total-Count', total);
    return data;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id (admin only)' })
  findOne(@Param('id') id: string) {
    return this.usersService.findByIdAdmin(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user role (admin only)' })
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(id, dto.role);
  }
}
```

- [ ] **Step 5: Обновить `src/users/users.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 6: Добавить `UsersModule` в `src/app.module.ts`**

```typescript
import { UsersModule } from './users/users.module';

// В массиве imports добавить:
UsersModule,
```

- [ ] **Step 7: Проверить что сервер запускается без ошибок**

```bash
npm run start:dev
```

Ожидаемый результат: в логах должны появиться маршруты `GET /users`, `GET /users/stats`, `GET /users/otp-codes`, `GET /users/refresh-tokens`, `GET /users/:id`, `PATCH /users/:id`.

- [ ] **Step 8: Commit**

```bash
git add src/users/ src/app.module.ts
git commit -m "feat: add admin-only users, otp-codes, refresh-tokens endpoints"
```

---

## Task 3: CORS в NestJS с exposedHeaders

**Files:**
- Modify: `src/main.ts`
- Modify: `.env`
- Modify: `.env.example`

- [ ] **Step 1: Добавить CORS в `src/main.ts`**

После строки `const app = await NestFactory.create(AppModule);` добавить:

```typescript
app.enableCors({
  origin: process.env.ADMIN_ORIGIN ?? 'http://localhost:3001',
  credentials: true,
  exposedHeaders: ['X-Total-Count'],
});
```

- [ ] **Step 2: Добавить в `.env` и `.env.example`**

```
ADMIN_ORIGIN=http://localhost:3001
```

- [ ] **Step 3: Commit**

```bash
git add src/main.ts .env .env.example
git commit -m "feat: enable CORS with X-Total-Count exposed header for admin panel"
```

---

## Task 4: authProvider

**Files:**
- Create: `packages/admin/src/providers/authProvider.ts`

- [ ] **Step 1: Создать `packages/admin/src/providers/authProvider.ts`**

```typescript
import type { AuthProvider } from '@refinedev/core';
import axios from 'axios';

const API_URL = '/api';

export const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    try {
      const { data } = await axios.post(`${API_URL}/auth/login/email`, {
        email,
        password,
      });

      // ResponseInterceptor оборачивает в { data: ..., message: 'success' }
      const payload = data.data ?? data;
      const { access_token, refresh_token } = payload;

      // Декодируем JWT для получения роли (сервер всё равно проверит)
      const tokenPayload = JSON.parse(atob(access_token.split('.')[1]));

      if (tokenPayload.role !== 'admin') {
        return {
          success: false,
          error: { name: 'Forbidden', message: 'Доступ запрещён. Только для администраторов.' },
        };
      }

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);

      return { success: true, redirectTo: '/dashboard' };
    } catch (error: any) {
      return {
        success: false,
        error: {
          name: 'Ошибка входа',
          message: error?.response?.data?.message ?? 'Неверные учётные данные',
        },
      };
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    const accessToken = localStorage.getItem('access_token');

    if (refreshToken && accessToken) {
      try {
        await axios.post(
          `${API_URL}/auth/logout`,
          { refresh_token: refreshToken },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
      } catch {
        // игнорируем ошибки при logout
      }
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    return { success: true, redirectTo: '/login' };
  },

  check: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return { authenticated: false, redirectTo: '/login' };

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) return { authenticated: false, redirectTo: '/login' };

        const { data } = await axios.post(`${API_URL}/auth/token/refresh`, {
          refresh_token: refreshToken,
        });
        // API возвращает только новый access_token, refresh_token не меняется
        const newAccessToken = (data.data ?? data).access_token;
        localStorage.setItem('access_token', newAccessToken);
      }
    } catch {
      return { authenticated: false, redirectTo: '/login' };
    }

    return { authenticated: true };
  },

  getPermissions: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role;
  },

  getIdentity: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { id: payload.sub, email: payload.email, role: payload.role };
  },

  onError: async (error) => {
    if (error?.response?.status === 401) {
      return { logout: true, redirectTo: '/login' };
    }
    return { error };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/admin/src/providers/authProvider.ts
git commit -m "feat(admin): add authProvider with JWT login, logout, role check"
```

---

## Task 5: dataProvider — кастомный с поддержкой X-Total-Count и ResponseInterceptor

**Files:**
- Create: `packages/admin/src/providers/dataProvider.ts`

- [ ] **Step 1: Создать `packages/admin/src/providers/dataProvider.ts`**

```typescript
import type { DataProvider } from '@refinedev/core';
import axios from 'axios';

const API_URL = '/api';

const axiosInstance = axios.create({ baseURL: API_URL });

// Добавляем JWT токен к каждому запросу
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Разворачиваем { data: ..., message: 'success' } из ResponseInterceptor
axiosInstance.interceptors.response.use((response) => {
  if (response.data?.data !== undefined) {
    // Сохраняем оригинальные заголовки для dataProvider
    response.data = response.data.data;
  }
  return response;
});

export const dataProvider: DataProvider = {
  getList: async ({ resource, pagination, sorters, filters }) => {
    const current = pagination?.current ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const start = (current - 1) * pageSize;
    const end = start + pageSize;

    const { data, headers } = await axiosInstance.get(`/${resource}`, {
      params: { _start: start, _end: end },
    });

    const total = parseInt(headers['x-total-count'] ?? '0', 10);

    return { data: Array.isArray(data) ? data : [], total };
  },

  getOne: async ({ resource, id }) => {
    const { data } = await axiosInstance.get(`/${resource}/${id}`);
    return { data };
  },

  update: async ({ resource, id, variables }) => {
    const { data } = await axiosInstance.patch(`/${resource}/${id}`, variables);
    return { data };
  },

  create: async ({ resource, variables }) => {
    const { data } = await axiosInstance.post(`/${resource}`, variables);
    return { data };
  },

  deleteOne: async ({ resource, id }) => {
    const { data } = await axiosInstance.delete(`/${resource}/${id}`);
    return { data };
  },

  getApiUrl: () => API_URL,

  custom: async ({ url, method, payload }) => {
    // url приходит как полный путь (e.g. '/api/users/stats'),
    // axiosInstance уже имеет baseURL '/api' — убираем дублирование
    const { data } = await axiosInstance.request({
      url: url.replace(API_URL, ''),
      method,
      data: payload,
    });
    return { data };
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/admin/src/providers/dataProvider.ts
git commit -m "feat(admin): add custom dataProvider with X-Total-Count and ResponseInterceptor support"
```

---

## Task 6: Страница логина

**Files:**
- Create: `packages/admin/src/pages/login/index.tsx`

- [ ] **Step 1: Создать `packages/admin/src/pages/login/index.tsx`**

```tsx
import { AuthPage } from '@refinedev/antd';

export const LoginPage = () => {
  return (
    <AuthPage
      type="login"
      title="ByteAll Admin"
      formProps={{
        initialValues: { email: '', password: '' },
      }}
    />
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/admin/src/pages/login/index.tsx
git commit -m "feat(admin): add login page"
```

---

## Task 7: Dashboard — статистика

**Files:**
- Create: `packages/admin/src/pages/dashboard/index.tsx`

- [ ] **Step 1: Создать `packages/admin/src/pages/dashboard/index.tsx`**

```tsx
import { useCustom, useApiUrl } from '@refinedev/core';
import { Card, Col, Row, Statistic, Spin } from 'antd';
import { UserOutlined, SafetyOutlined, KeyOutlined, MailOutlined } from '@ant-design/icons';

interface Stats {
  totalUsers: number;
  verifiedUsers: number;
  activeTokens: number;
  otpToday: number;
}

export const DashboardPage = () => {
  const apiUrl = useApiUrl();
  const { data, isLoading } = useCustom<Stats>({
    url: `${apiUrl}/users/stats`,
    method: 'get',
  });

  const stats = data?.data;

  if (isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  }

  return (
    <Row gutter={[16, 16]} style={{ padding: 24 }}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Всего пользователей"
            value={stats?.totalUsers ?? 0}
            prefix={<UserOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Подтверждённые"
            value={stats?.verifiedUsers ?? 0}
            prefix={<SafetyOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="Активных сессий"
            value={stats?.activeTokens ?? 0}
            prefix={<KeyOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="OTP сегодня"
            value={stats?.otpToday ?? 0}
            prefix={<MailOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/admin/src/pages/dashboard/index.tsx
git commit -m "feat(admin): add dashboard with stats cards"
```

---

## Task 8: Страницы пользователей

**Files:**
- Create: `packages/admin/src/pages/users/list.tsx`
- Create: `packages/admin/src/pages/users/show.tsx`
- Create: `packages/admin/src/pages/users/edit.tsx`
- Create: `packages/admin/src/pages/users/index.tsx`

- [ ] **Step 1: Создать `packages/admin/src/pages/users/list.tsx`**

```tsx
import { List, useTable, DateField, EditButton, ShowButton } from '@refinedev/antd';
import { Table, Space, Tag } from 'antd';

export const UserList = () => {
  const { tableProps } = useTable({ syncWithLocation: true });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="email" title="Email" render={(v) => v ?? '—'} />
        <Table.Column dataIndex="phone" title="Телефон" render={(v) => v ?? '—'} />
        <Table.Column
          dataIndex="role"
          title="Роль"
          render={(role) => (
            <Tag color={role === 'admin' ? 'red' : 'blue'}>{role}</Tag>
          )}
        />
        <Table.Column
          dataIndex="isVerified"
          title="Подтверждён"
          render={(v) => <Tag color={v ? 'green' : 'orange'}>{v ? 'Да' : 'Нет'}</Tag>}
        />
        <Table.Column
          dataIndex="createdAt"
          title="Дата регистрации"
          render={(v) => <DateField value={v} format="DD.MM.YYYY HH:mm" />}
        />
        <Table.Column
          title="Действия"
          render={(_, record: any) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={record.id} />
              <EditButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
};
```

- [ ] **Step 2: Создать `packages/admin/src/pages/users/show.tsx`**

```tsx
import { Show, TextField, DateField } from '@refinedev/antd';
import { useShow } from '@refinedev/core';
import { Typography, Tag } from 'antd';

const { Title } = Typography;

export const UserShow = () => {
  const { queryResult } = useShow();
  const { data, isLoading } = queryResult;
  const record = data?.data;

  return (
    <Show isLoading={isLoading}>
      <Title level={5}>ID</Title>
      <TextField value={record?.id} />

      <Title level={5}>Email</Title>
      <TextField value={record?.email ?? '—'} />

      <Title level={5}>Телефон</Title>
      <TextField value={record?.phone ?? '—'} />

      <Title level={5}>Роль</Title>
      <Tag color={record?.role === 'admin' ? 'red' : 'blue'}>{record?.role}</Tag>

      <Title level={5}>Подтверждён</Title>
      <Tag color={record?.isVerified ? 'green' : 'orange'}>
        {record?.isVerified ? 'Да' : 'Нет'}
      </Tag>

      <Title level={5}>Дата регистрации</Title>
      <DateField value={record?.createdAt} format="DD.MM.YYYY HH:mm" />
    </Show>
  );
};
```

- [ ] **Step 3: Создать `packages/admin/src/pages/users/edit.tsx`**

```tsx
import { Edit, useForm } from '@refinedev/antd';
import { Form, Select } from 'antd';

export const UserEdit = () => {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Роль" name="role" rules={[{ required: true }]}>
          <Select
            options={[
              { label: 'user', value: 'user' },
              { label: 'admin', value: 'admin' },
            ]}
          />
        </Form.Item>
      </Form>
    </Edit>
  );
};
```

- [ ] **Step 4: Создать `packages/admin/src/pages/users/index.tsx`**

```typescript
export { UserList } from './list';
export { UserShow } from './show';
export { UserEdit } from './edit';
```

- [ ] **Step 5: Commit**

```bash
git add packages/admin/src/pages/users/
git commit -m "feat(admin): add users list, show, edit pages"
```

---

## Task 9: OTP коды и Refresh токены (read-only)

**Files:**
- Create: `packages/admin/src/pages/otp-codes/list.tsx`
- Create: `packages/admin/src/pages/refresh-tokens/list.tsx`

> **Важно:** Ресурсы Refine называются `users/otp-codes` и `users/refresh-tokens` — это соответствует маршрутам API `/users/otp-codes` и `/users/refresh-tokens`.

- [ ] **Step 1: Создать `packages/admin/src/pages/otp-codes/list.tsx`**

```tsx
import { List, useTable, DateField } from '@refinedev/antd';
import { Table, Tag } from 'antd';

export const OtpCodeList = () => {
  const { tableProps } = useTable({ syncWithLocation: true });

  return (
    <List canCreate={false}>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          title="Пользователь"
          render={(_, record: any) => record?.user?.email ?? record?.user?.phone ?? '—'}
        />
        <Table.Column dataIndex="type" title="Тип" render={(v) => <Tag>{v}</Tag>} />
        <Table.Column
          dataIndex="used"
          title="Использован"
          render={(v) => <Tag color={v ? 'green' : 'orange'}>{v ? 'Да' : 'Нет'}</Tag>}
        />
        <Table.Column dataIndex="attempts" title="Попыток" />
        <Table.Column
          dataIndex="expiresAt"
          title="Истекает"
          render={(v) => <DateField value={v} format="DD.MM.YYYY HH:mm" />}
        />
        <Table.Column
          dataIndex="createdAt"
          title="Создан"
          render={(v) => <DateField value={v} format="DD.MM.YYYY HH:mm" />}
        />
      </Table>
    </List>
  );
};
```

- [ ] **Step 2: Создать `packages/admin/src/pages/refresh-tokens/list.tsx`**

```tsx
import { List, useTable, DateField } from '@refinedev/antd';
import { Table, Tag } from 'antd';

export const RefreshTokenList = () => {
  const { tableProps } = useTable({ syncWithLocation: true });

  return (
    <List canCreate={false}>
      <Table {...tableProps} rowKey="id">
        <Table.Column
          title="Пользователь"
          render={(_, record: any) => record?.user?.email ?? record?.user?.phone ?? '—'}
        />
        <Table.Column
          dataIndex="revoked"
          title="Отозван"
          render={(v) => <Tag color={v ? 'red' : 'green'}>{v ? 'Да' : 'Нет'}</Tag>}
        />
        <Table.Column
          dataIndex="expiresAt"
          title="Истекает"
          render={(v) => <DateField value={v} format="DD.MM.YYYY HH:mm" />}
        />
        <Table.Column
          dataIndex="createdAt"
          title="Создан"
          render={(v) => <DateField value={v} format="DD.MM.YYYY HH:mm" />}
        />
      </Table>
    </List>
  );
};
```

- [ ] **Step 3: Commit**

```bash
git add packages/admin/src/pages/otp-codes/ packages/admin/src/pages/refresh-tokens/
git commit -m "feat(admin): add otp-codes and refresh-tokens read-only pages"
```

---

## Task 10: 403 страница и App.tsx — сборка приложения

**Files:**
- Create: `packages/admin/src/pages/forbidden/index.tsx`
- Create: `packages/admin/src/App.tsx`
- Create: `packages/admin/src/main.tsx`

- [ ] **Step 1: Создать `packages/admin/src/pages/forbidden/index.tsx`**

```tsx
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export const ForbiddenPage = () => {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="403"
      subTitle="У вас нет доступа к этой странице."
      extra={
        <Button type="primary" onClick={() => navigate('/login')}>
          Войти
        </Button>
      }
    />
  );
};
```

- [ ] **Step 2: Создать `packages/admin/src/App.tsx`**

```tsx
import { Refine, Authenticated } from '@refinedev/core';
import {
  RefineThemes,
  ThemedLayoutV2,
  useNotificationProvider,
} from '@refinedev/antd';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import '@refinedev/antd/dist/reset.css';

import { authProvider } from './providers/authProvider';
import { dataProvider } from './providers/dataProvider';

import { DashboardPage } from './pages/dashboard';
import { UserList, UserShow, UserEdit } from './pages/users';
import { OtpCodeList } from './pages/otp-codes/list';
import { RefreshTokenList } from './pages/refresh-tokens/list';
import { LoginPage } from './pages/login';
import { ForbiddenPage } from './pages/forbidden';

import {
  DashboardOutlined,
  UserOutlined,
  SafetyOutlined,
  KeyOutlined,
} from '@ant-design/icons';

export default function App() {
  return (
    <BrowserRouter>
      <ConfigProvider theme={RefineThemes.Blue}>
        <AntdApp>
          <Refine
            authProvider={authProvider}
            dataProvider={dataProvider}
            notificationProvider={useNotificationProvider}
            resources={[
              {
                name: 'dashboard',
                list: '/dashboard',
                meta: { label: 'Dashboard', icon: <DashboardOutlined /> },
              },
              {
                name: 'users',
                list: '/users',
                show: '/users/:id',
                edit: '/users/:id/edit',
                meta: { label: 'Пользователи', icon: <UserOutlined /> },
              },
              {
                // имя ресурса = путь к API: /api/users/otp-codes
                name: 'users/otp-codes',
                list: '/otp-codes',
                meta: { label: 'OTP Коды', icon: <SafetyOutlined /> },
              },
              {
                // имя ресурса = путь к API: /api/users/refresh-tokens
                name: 'users/refresh-tokens',
                list: '/refresh-tokens',
                meta: { label: 'Refresh Токены', icon: <KeyOutlined /> },
              },
            ]}
            options={{ syncWithLocation: true, warnWhenUnsavedChanges: true }}
          >
            <Routes>
              <Route index element={<Navigate to="/dashboard" />} />
              <Route
                element={
                  <Authenticated key="auth" fallback={<Navigate to="/login" />}>
                    <ThemedLayoutV2>
                      <Outlet />
                    </ThemedLayoutV2>
                  </Authenticated>
                }
              >
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/users" element={<UserList />} />
                <Route path="/users/:id" element={<UserShow />} />
                <Route path="/users/:id/edit" element={<UserEdit />} />
                <Route path="/otp-codes" element={<OtpCodeList />} />
                <Route path="/refresh-tokens" element={<RefreshTokenList />} />
                <Route path="/403" element={<ForbiddenPage />} />
              </Route>
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}
```

- [ ] **Step 3: Создать `packages/admin/src/main.tsx`**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 4: Запустить и проверить**

В двух терминалах:
```bash
# Терминал 1
npm run start:dev

# Терминал 2
cd packages/admin && npm run dev
```

Открыть `http://localhost:3001` — должна открыться страница логина.
Войти с email/password пользователя с ролью `admin`.

- [ ] **Step 5: Commit**

```bash
git add packages/admin/src/
git commit -m "feat(admin): wire up App.tsx with all pages, routing, and providers"
```

---

## Итог

После выполнения всех задач:
- `npm run start:dev` — API на `:3000`
- `cd packages/admin && npm run dev` — админка на `:3001`
- Логин через email/password с ролью `admin`
- Разделы: Dashboard (статистика), Пользователи (просмотр + редактирование роли), OTP коды (read-only), Refresh токены (read-only)
