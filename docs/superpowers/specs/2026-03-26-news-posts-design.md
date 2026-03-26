# News/Posts Module Design

## Goal

Добавить модуль новостей/статей: авторизованные пользователи пишут статьи в rich text редакторе (TipTap), публичное API отдаёт список опубликованных постов, администраторы управляют всем контентом через admin панель.

## Architecture

**Backend:** NestJS модули `posts`, `categories`, `tags`, `uploads` по существующему паттерну (controller → service → repository → Prisma). Все ответы оборачиваются существующим `ResponseInterceptor` в `{ data: ..., message: 'success' }`.

**Frontend:** Новый раздел "Новости" в admin панели (Refine v4 + Ant Design 5) в `packages/admin/`. TipTap v2 rich text редактор.

**Storage:** Supabase Storage (public bucket `post-images`) для изображений через `@supabase/supabase-js`.

**ENV (добавить в `.env`):**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=service_role_key_here
```

**Установить зависимости:**
```bash
# Backend
npm install @supabase/supabase-js slugify

# Frontend (packages/admin)
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-underline
```

**Добавить в `AppModule.imports`:**
```typescript
PostsModule, CategoriesModule, TagsModule, UploadsModule
```

---

## Data Models (Prisma)

Все новые модели следуют существующей конвенции `@map`/`@@map` для snake_case в PostgreSQL.

### Добавить в `User` модель
```prisma
posts Post[]  // обратная связь
```

### Enum PostStatus
```prisma
enum PostStatus {
  draft
  published
}
```

### Post
```prisma
model Post {
  id          String     @id @default(uuid())
  title       String
  slug        String     @unique
  content     String     // HTML от TipTap
  coverUrl    String?    @map("cover_url")
  status      PostStatus @default(draft)
  authorId    String     @map("author_id")
  categoryId  String?    @map("category_id")
  publishedAt DateTime?  @map("published_at")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  author   User      @relation(fields: [authorId], references: [id], onDelete: Cascade)
  category Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  tags     PostTag[]

  @@map("posts")
}
```

### Category
```prisma
model Category {
  id    String  @id @default(uuid())
  name  String  @unique
  slug  String  @unique
  posts Post[]

  // timestamps намеренно опущены — lookup-таблица, не нужна история изменений
  @@map("categories")
}
```

### Tag
```prisma
model Tag {
  id    String    @id @default(uuid())
  name  String    @unique
  slug  String    @unique
  posts PostTag[]

  // timestamps намеренно опущены — lookup-таблица
  @@map("tags")
}
```

### PostTag
```prisma
model PostTag {
  postId String @map("post_id")
  tagId  String @map("tag_id")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("post_tags")
}
```

---

## Slug Generation

- Slug генерируется **один раз при создании** из `title` через библиотеку `slugify` (уже может быть в проекте, иначе добавить).
- Slug **не меняется** при обновлении title — стабильность URL.
- При коллизии добавляется суффикс: `my-title`, `my-title-2`, `my-title-3`.
- Slug **нередактируем** пользователем — только авто-генерация.

---

## DTOs

### CreatePostDto
```typescript
title      string  @IsString @IsNotEmpty @MaxLength(255)
content    string  @IsString @IsNotEmpty
coverUrl   string? @IsOptional @IsUrl
categoryId string? @IsOptional @IsUUID
tagIds     string[] @IsOptional @IsArray @IsUUID each
status     PostStatus @IsOptional @IsEnum(PostStatus) // default: draft
```

### UpdatePostDto
```typescript
// PartialType(CreatePostDto) — все поля опциональны
// authorId не обновляется никогда
```

### UpdatePostStatusDto (admin only)
```typescript
status PostStatus @IsEnum(PostStatus)
// Можно переключать в любую сторону (draft ↔ published)
```

### CreateCategoryDto / CreateTagDto
```typescript
name string @IsString @IsNotEmpty @MaxLength(100)
// slug авто-генерируется из name
```

---

## API Endpoints

### Публичные (без авторизации, `@SkipThrottle()`)

| Method | Path | Query params | Response |
|--------|------|-------------|----------|
| GET | /posts | `_start`, `_end`, `categorySlug?`, `tag?` | `{ data: PostSummary[], message }`, header `X-Total-Count` |
| GET | /posts/:slug | — | `{ data: PostFull, message }` — 404 если draft |
| GET | /categories | — | `{ data: Category[], message }` |
| GET | /tags | — | `{ data: Tag[], message }` |

**PostSummary** (список, без `content`; `updatedAt` намеренно опущен — не нужен в list view):
```typescript
{ id, title, slug, coverUrl, status, publishedAt, createdAt,
  author: { id, email }, category: { id, name, slug } | null,
  tags: { id, name, slug }[] }
```

**PostFull** (одна статья, включает `content`):
```typescript
{ id, title, slug, content, coverUrl, status, publishedAt, createdAt, updatedAt,
  author: { id, email }, category: { id, name, slug } | null,
  tags: { id, name, slug }[] }
```

---

### Авторизованные (JwtAuthGuard, любой пользователь)

| Method | Path | Response |
|--------|------|----------|
| POST | /posts | `{ data: PostFull, message }` — 201 |
| GET | /posts/me | `{ data: PostSummary[], message }`, `X-Total-Count`, query: `_start`, `_end` |
| PATCH | /posts/:id | `{ data: PostFull, message }` — 403 если не автор и не admin |
| DELETE | /posts/:id | 204 — 403 если не автор и не admin |
| POST | /uploads/image | `{ data: { url: string }, message }` |

**Важно:** `/posts/me` регистрируется в контроллере **раньше** `/posts/:slug`, чтобы NestJS не перехватил `"me"` как параметр slug.

**Единственный маршрут DELETE /posts/:id** — authorization в сервисе: автор ИЛИ admin. Один guard `JwtAuthGuard`, логика ветвления внутри сервиса.

**Аналогично для PATCH /posts/:id** — один маршрут, ветвление в сервисе.

---

### Admin only (JwtAuthGuard + RolesGuard + @Roles(UserRole.admin))

Расположены в `posts.admin.controller.ts` с `@Controller('posts')` — тот же prefix что и основной контроллер, оба зарегистрированы в `PostsModule`.

**Порядок контроллеров в `PostsModule`:** `posts.admin.controller.ts` должен быть зарегистрирован **первым** в массиве `controllers`, чтобы литеральный путь `/posts/admin` не был перехвачен параметром `/:slug` из основного контроллера. То же правило что и для `/posts/me`.

`PATCH /posts/:id/status` vs `PATCH /posts/:id` — не конфликтуют: NestJS корректно различает `/:id` и `/:id/status` как разные сегменты.

| Method | Path | Response |
|--------|------|----------|
| GET | /posts/admin | `{ data: PostSummary[], message }`, `X-Total-Count`, query: `_start`, `_end`, `status?`, `categoryId?` |
| PATCH | /posts/:id/status | `{ data: PostFull, message }` |
| POST | /categories | `{ data: Category, message }` — 201 |
| DELETE | /categories/:id | 204 |
| POST | /tags | `{ data: Tag, message }` — 201 |
| DELETE | /tags/:id | 204 |

---

## Загрузка изображений (Supabase Storage)

- Bucket: `post-images` (public read, создать вручную в Supabase)
- Путь для обложек: `covers/{userId}/{timestamp}-{filename}`
- Путь для inline: `content/{userId}/{timestamp}-{filename}`
- Принимаемые MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Максимальный размер: 5 MB
- Multipart form field name: `file` (Ant Design Upload и TipTap image extension используют это имя)
- `UploadsService` использует `@supabase/supabase-js` `createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)`
- Возвращает публичный URL через `supabase.storage.from('post-images').getPublicUrl(path)`
- Контроллер: `@UseInterceptors(FileInterceptor('file'))`, `@ApiConsumes('multipart/form-data')`

**Multer v2 — `fileFilter` callback (изменённая сигнатура в v2):**
```typescript
// Multer v2: callback(error: Error | null, acceptFile: boolean)
// НЕ callback(null, true) из multer v1 примеров
const fileFilter = (req, file, callback) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(new UnsupportedMediaTypeException('Unsupported file type'), false);
  }
};
```

**Ошибки:** 413 (file > 5MB), 415 (неподдерживаемый MIME type).

---

## Authorization Rules

| Действие | Условие |
|----------|---------|
| Читать список опубликованных постов | Публично |
| Читать один пост по slug | Публично — только `published`; черновики → 404 |
| Читать свои посты (включая черновики) | JWT — только свои (`GET /posts/me`) |
| Превью своего черновика | `GET /posts/me` возвращает все свои посты; фронт использует ID для редактора |
| Создать пост | JWT (любой) |
| Редактировать/удалить пост | JWT + (автор ИЛИ admin) — проверка в сервисе |
| Сменить статус любого поста | admin only |
| CRUD категорий и тегов | admin only |
| Загружать изображения | JWT (любой) |

---

## File Structure

```
src/
  posts/
    posts.controller.ts         — публичные + user endpoints (/posts, /posts/me, /posts/:slug, /posts/:id)
    posts.admin.controller.ts   — admin endpoints (@Controller('posts'), регистрируется в PostsModule)
    posts.service.ts
    posts.repository.ts
    posts.module.ts
    dto/
      create-post.dto.ts
      update-post.dto.ts
      update-post-status.dto.ts
  categories/
    categories.controller.ts    — GET /categories (public) + POST/DELETE admin
    categories.service.ts
    categories.repository.ts
    categories.module.ts
    dto/
      create-category.dto.ts
  tags/
    tags.controller.ts          — GET /tags (public) + POST/DELETE admin
    tags.service.ts
    tags.repository.ts
    tags.module.ts
    dto/
      create-tag.dto.ts
  uploads/
    uploads.controller.ts       — POST /uploads/image (JWT)
    uploads.service.ts          — Supabase Storage SDK
    uploads.module.ts

packages/admin/src/
  pages/
    posts/
      list.tsx    — таблица всех постов (admin: все; user: свои)
      create.tsx  — создание с TipTap
      edit.tsx    — редактирование с TipTap
      index.tsx
    categories/
      list.tsx    — список с кнопкой добавить/удалить
      index.tsx
    tags/
      list.tsx
      index.tsx
  components/
    RichTextEditor.tsx  — TipTap wrapper
```

---

## Admin Panel UI

### Сайдбар — новая группа "Новости"
- Все статьи (`/posts`)
- Категории (`/categories`)
- Теги (`/tags`)

### Список постов
- Таблица: заголовок, автор (email), категория, теги, статус (badge: черновик/опубликован), дата публикации
- Быстрая смена статуса через Select в строке
- Фильтры: по статусу, по категории

### Форма создания/редактирования
1. **Title** — Input (required)
2. **Cover** — Upload компонент → `POST /uploads/image` → превью
3. **Category** — Select (данные из `GET /categories`)
4. **Tags** — MultiSelect (данные из `GET /tags`)
5. **Content** — `RichTextEditor` (TipTap) с тулбаром:
   - H1, H2, H3, Bold, Italic, Underline
   - Bullet list, Ordered list, Link
   - Image: выбор файла → `POST /uploads/image` → вставка URL в редактор
6. Кнопки: **"Черновик"** (`status: draft`) | **"Опубликовать"** (`status: published`)

### Swagger
Все новые контроллеры используют `@ApiTags`, `@ApiOperation`, `@ApiBearerAuth` — как в существующих контроллерах.

---

## Tech Stack

- **Backend:** NestJS, Prisma v7, `@supabase/supabase-js`, `slugify`, `multer` (для file upload)
- **Frontend:** React, Refine v4, Ant Design 5, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-underline`
- **Storage:** Supabase Storage (public bucket `post-images`)
