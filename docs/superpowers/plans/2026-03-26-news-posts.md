# News/Posts Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить модуль новостей: авторизованные пользователи создают статьи в TipTap rich text редакторе, публичное API отдаёт опубликованные посты, администраторы управляют всем контентом через admin панель.

**Architecture:** NestJS модули `posts`, `categories`, `tags`, `uploads` по паттерну controller→service→repository→Prisma. Суpabase Storage для изображений. Refine+Ant Design admin панель с TipTap редактором.

**Tech Stack:** NestJS, Prisma v7, `@supabase/supabase-js`, `slugify`, `multer`, TipTap v2, Refine v4, Ant Design 5

**Spec:** `docs/superpowers/specs/2026-03-26-news-posts-design.md`

---

## Файловая структура

```
src/
  posts/
    posts.controller.ts
    posts.admin.controller.ts
    posts.service.ts
    posts.repository.ts
    posts.module.ts
    dto/
      create-post.dto.ts
      update-post.dto.ts
      update-post-status.dto.ts
  categories/
    categories.controller.ts
    categories.service.ts
    categories.repository.ts
    categories.module.ts
    dto/create-category.dto.ts
  tags/
    tags.controller.ts
    tags.service.ts
    tags.repository.ts
    tags.module.ts
    dto/create-tag.dto.ts
  uploads/
    uploads.controller.ts
    uploads.service.ts
    uploads.module.ts

prisma/schema.prisma                        — добавить модели
prisma/migrations/                          — новая миграция
src/app.module.ts                           — добавить 4 модуля

packages/admin/src/
  App.tsx                                   — добавить ресурсы posts/categories/tags
  components/RichTextEditor.tsx             — новый TipTap wrapper
  pages/
    posts/list.tsx
    posts/create.tsx
    posts/edit.tsx
    posts/index.tsx
    categories/list.tsx
    categories/index.tsx
    tags/list.tsx
    tags/index.tsx
```

---

## Task 1: Prisma schema — новые модели

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Добавить enum и модели в конец schema.prisma**

```prisma
enum PostStatus {
  draft
  published
}

model Post {
  id          String     @id @default(uuid())
  title       String
  slug        String     @unique
  content     String
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

model Category {
  id    String @id @default(uuid())
  name  String @unique
  slug  String @unique
  posts Post[]

  @@map("categories")
}

model Tag {
  id    String    @id @default(uuid())
  name  String    @unique
  slug  String    @unique
  posts PostTag[]

  @@map("tags")
}

model PostTag {
  postId String @map("post_id")
  tagId  String @map("tag_id")

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId])
  @@map("post_tags")
}
```

- [ ] **Step 2: Добавить обратную связь posts в модель User**

В существующей модели `User` добавить после последнего поля:
```prisma
  posts Post[]
```

- [ ] **Step 3: Создать и применить миграцию**

```bash
npx prisma migrate dev --name add_posts_categories_tags
```

Ожидаемый результат: `The following migration(s) have been applied` без ошибок.

- [ ] **Step 4: Регенерировать Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(prisma): add Post, Category, Tag, PostTag models"
```

---

## Task 2: Установить зависимости

**Files:** `package.json`, `packages/admin/package.json`

- [ ] **Step 1: Установить backend зависимости**

```bash
npm install @supabase/supabase-js slugify
```

- [ ] **Step 2: Установить frontend зависимости**

```bash
cd packages/admin
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-underline
cd ../..
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json packages/admin/package.json packages/admin/package-lock.json
git commit -m "chore: install supabase, slugify, tiptap dependencies"
```

---

## Task 3: Categories модуль

**Files:**
- Create: `src/categories/dto/create-category.dto.ts`
- Create: `src/categories/categories.repository.ts`
- Create: `src/categories/categories.service.ts`
- Create: `src/categories/categories.controller.ts`
- Create: `src/categories/categories.module.ts`

- [ ] **Step 1: Создать DTO**

`src/categories/dto/create-category.dto.ts`:
```typescript
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Новости' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
```

- [ ] **Step 2: Создать Repository**

`src/categories/categories.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  create(name: string, slug: string) {
    return this.prisma.category.create({ data: { id: randomUUID(), name, slug } });
  }

  delete(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}
```

- [ ] **Step 3: Создать Service**

`src/categories/categories.service.ts`:
```typescript
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import slugify from 'slugify';

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const existing = await this.repo.findAll();
    if (existing.some((c) => c.slug === slug)) {
      throw new ConflictException('Category with this name already exists');
    }
    return this.repo.create(dto.name, slug);
  }

  async delete(id: string) {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    return this.repo.delete(id);
  }
}
```

- [ ] **Step 4: Создать Controller**

`src/categories/categories.controller.ts`:
```typescript
import {
  Controller, Get, Post, Delete, Param, Body,
  HttpCode, HttpStatus, UseGuards, SkipThrottle,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Get all categories (public)' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create category (admin only)' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category (admin only)' })
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
```

- [ ] **Step 5: Создать Module**

`src/categories/categories.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { CategoriesRepository } from './categories.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CategoriesRepository, RolesGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
```

- [ ] **Step 6: Добавить CategoriesModule в AppModule**

В `src/app.module.ts` добавить импорт:
```typescript
import { CategoriesModule } from './categories/categories.module';
// в imports массив:
CategoriesModule,
```

- [ ] **Step 7: Проверить компиляцию**

```bash
npm run build
```

Ожидаемый результат: сборка без ошибок.

- [ ] **Step 8: Commit**

```bash
git add src/categories/ src/app.module.ts
git commit -m "feat(categories): add Categories module with CRUD"
```

---

## Task 4: Tags модуль

**Files:**
- Create: `src/tags/dto/create-tag.dto.ts`
- Create: `src/tags/tags.repository.ts`
- Create: `src/tags/tags.service.ts`
- Create: `src/tags/tags.controller.ts`
- Create: `src/tags/tags.module.ts`

- [ ] **Step 1: Создать DTO**

`src/tags/dto/create-tag.dto.ts`:
```typescript
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'обновление' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
}
```

- [ ] **Step 2: Создать Repository**

`src/tags/tags.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.tag.findUnique({ where: { id } });
  }

  findByIds(ids: string[]) {
    return this.prisma.tag.findMany({ where: { id: { in: ids } } });
  }

  create(name: string, slug: string) {
    return this.prisma.tag.create({ data: { id: randomUUID(), name, slug } });
  }

  delete(id: string) {
    return this.prisma.tag.delete({ where: { id } });
  }
}
```

- [ ] **Step 3: Создать Service**

`src/tags/tags.service.ts`:
```typescript
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TagsRepository } from './tags.repository';
import { CreateTagDto } from './dto/create-tag.dto';
import slugify from 'slugify';

@Injectable()
export class TagsService {
  constructor(private readonly repo: TagsRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  findByIds(ids: string[]) {
    return this.repo.findByIds(ids);
  }

  async create(dto: CreateTagDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const existing = await this.repo.findAll();
    if (existing.some((t) => t.slug === slug)) {
      throw new ConflictException('Tag with this name already exists');
    }
    return this.repo.create(dto.name, slug);
  }

  async delete(id: string) {
    const tag = await this.repo.findById(id);
    if (!tag) throw new NotFoundException('Tag not found');
    return this.repo.delete(id);
  }
}
```

- [ ] **Step 4: Создать Controller**

`src/tags/tags.controller.ts`:
```typescript
import {
  Controller, Get, Post, Delete, Param, Body,
  HttpCode, HttpStatus, UseGuards, SkipThrottle,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Get all tags (public)' })
  findAll() {
    return this.tagsService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create tag (admin only)' })
  create(@Body() dto: CreateTagDto) {
    return this.tagsService.create(dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete tag (admin only)' })
  delete(@Param('id') id: string) {
    return this.tagsService.delete(id);
  }
}
```

- [ ] **Step 5: Создать Module**

`src/tags/tags.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { TagsRepository } from './tags.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [TagsController],
  providers: [TagsService, TagsRepository, RolesGuard],
  exports: [TagsService],
})
export class TagsModule {}
```

- [ ] **Step 6: Добавить TagsModule в AppModule**

```typescript
import { TagsModule } from './tags/tags.module';
// в imports:
TagsModule,
```

- [ ] **Step 7: Проверить компиляцию**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/tags/ src/app.module.ts
git commit -m "feat(tags): add Tags module with CRUD"
```

---

## Task 5: Uploads модуль

**Files:**
- Create: `src/uploads/uploads.controller.ts`
- Create: `src/uploads/uploads.service.ts`
- Create: `src/uploads/uploads.module.ts`

- [ ] **Step 1: Убедиться что SUPABASE_URL и SUPABASE_SERVICE_KEY есть в .env**

Добавить в `.env`:
```
SUPABASE_URL=https://rdptiipxbscetxrggbds.supabase.co
SUPABASE_SERVICE_KEY=<service_role_key_from_supabase_dashboard>
```

Supabase Service Key находится в: Supabase Dashboard → Project Settings → API → `service_role` key.

- [ ] **Step 2: Создать UploadsService**

`src/uploads/uploads.service.ts`:
```typescript
import {
  Injectable,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class UploadsService {
  private supabase;

  constructor(private readonly config: ConfigService) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_KEY'),
    );
  }

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
    folder: 'covers' | 'content',
  ): Promise<{ url: string }> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Unsupported file type');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new PayloadTooLargeException('File exceeds 5 MB limit');
    }

    const ext = file.originalname.split('.').pop();
    const path = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await this.supabase.storage
      .from('post-images')
      .upload(path, file.buffer, { contentType: file.mimetype });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    const { data } = this.supabase.storage.from('post-images').getPublicUrl(path);
    return { url: data.publicUrl };
  }
}
```

- [ ] **Step 3: Создать UploadsController**

`src/uploads/uploads.controller.ts`:
```typescript
import {
  Controller, Post, UseGuards, UseInterceptors,
  UploadedFile, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiConsumes, ApiBody,
} from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload image to Supabase Storage' })
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: { sub: string },
    @Query('folder') folder: 'covers' | 'content' = 'content',
  ) {
    return this.uploadsService.uploadImage(file, user.sub, folder);
  }
}
```

- [ ] **Step 4: Создать UploadsModule**

`src/uploads/uploads.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
```

- [ ] **Step 5: Добавить UploadsModule в AppModule**

```typescript
import { UploadsModule } from './uploads/uploads.module';
// в imports:
UploadsModule,
```

- [ ] **Step 6: Проверить компиляцию**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/uploads/ src/app.module.ts .env
git commit -m "feat(uploads): add image upload to Supabase Storage"
```

---

## Task 6: Posts модуль — DTOs и Repository

**Files:**
- Create: `src/posts/dto/create-post.dto.ts`
- Create: `src/posts/dto/update-post.dto.ts`
- Create: `src/posts/dto/update-post-status.dto.ts`
- Create: `src/posts/posts.repository.ts`

- [ ] **Step 1: Создать CreatePostDto**

`src/posts/dto/create-post.dto.ts`:
```typescript
import {
  IsArray, IsEnum, IsNotEmpty, IsOptional,
  IsString, IsUrl, IsUUID, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';

export class CreatePostDto {
  @ApiProperty({ example: 'My first article' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: '<p>Content here</p>' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'https://storage.supabase.co/...' })
  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: ['uuid1', 'uuid2'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ enum: PostStatus, default: PostStatus.draft })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
```

- [ ] **Step 2: Создать UpdatePostDto**

`src/posts/dto/update-post.dto.ts`:
```typescript
import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';

export class UpdatePostDto extends PartialType(CreatePostDto) {}
```

- [ ] **Step 3: Создать UpdatePostStatusDto**

`src/posts/dto/update-post-status.dto.ts`:
```typescript
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';

export class UpdatePostStatusDto {
  @ApiProperty({ enum: PostStatus })
  @IsEnum(PostStatus)
  status: PostStatus;
}
```

- [ ] **Step 4: Создать PostsRepository**

`src/posts/posts.repository.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus } from '@prisma/client';
import slugify from 'slugify';

const POST_INCLUDE = {
  author: { select: { id: true, email: true } },
  category: { select: { id: true, name: true, slug: true } },
  tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
};

function mapPost(post: any) {
  return { ...post, tags: post.tags.map((pt: any) => pt.tag) };
}

@Injectable()
export class PostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublished(start: number, take: number, categorySlug?: string, tag?: string) {
    const where: any = { status: PostStatus.published };
    if (categorySlug) where.category = { slug: categorySlug };
    if (tag) where.tags = { some: { tag: { slug: tag } } };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where, skip: start, take,
        orderBy: { publishedAt: 'desc' },
        include: POST_INCLUDE,
      }),
      this.prisma.post.count({ where }),
    ]);
    return { data: data.map(mapPost), total };
  }

  async findBySlugPublished(slug: string) {
    const post = await this.prisma.post.findFirst({
      where: { slug, status: PostStatus.published },
      include: POST_INCLUDE,
    });
    return post ? mapPost(post) : null;
  }

  async findByAuthor(authorId: string, start: number, take: number) {
    const where = { authorId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where, skip: start, take,
        orderBy: { createdAt: 'desc' },
        include: POST_INCLUDE,
      }),
      this.prisma.post.count({ where }),
    ]);
    return { data: data.map(mapPost), total };
  }

  async findByIdForOwner(id: string) {
    const post = await this.prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
    return post ? mapPost(post) : null;
  }

  async findAllAdmin(start: number, take: number, status?: PostStatus, categoryId?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where, skip: start, take,
        orderBy: { createdAt: 'desc' },
        include: POST_INCLUDE,
      }),
      this.prisma.post.count({ where }),
    ]);
    return { data: data.map(mapPost), total };
  }

  async create(data: {
    title: string; slug: string; content: string; coverUrl?: string;
    status: PostStatus; authorId: string; categoryId?: string; tagIds?: string[];
  }) {
    const { tagIds, ...rest } = data;
    const post = await this.prisma.post.create({
      data: {
        ...rest,
        id: randomUUID(),
        publishedAt: data.status === PostStatus.published ? new Date() : null,
        // Prisma nested create: postId is auto-filled from parent, don't supply it
        tags: tagIds?.length
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: POST_INCLUDE,
    });
    return mapPost(post);
  }

  async update(id: string, data: {
    title?: string; content?: string; coverUrl?: string;
    status?: PostStatus; categoryId?: string; tagIds?: string[];
  }) {
    const { tagIds, status, ...rest } = data;
    const current = await this.prisma.post.findUnique({ where: { id }, select: { status: true, publishedAt: true } });

    const publishedAt =
      status === PostStatus.published && current?.status !== PostStatus.published
        ? new Date()
        : status === PostStatus.draft
          ? null
          : undefined;

    await this.prisma.$transaction(async (tx) => {
      if (tagIds !== undefined) {
        await tx.postTag.deleteMany({ where: { postId: id } });
        if (tagIds.length > 0) {
          await tx.postTag.createMany({ data: tagIds.map((tagId) => ({ postId: id, tagId })) });
        }
      }
      await tx.post.update({
        where: { id },
        data: { ...rest, ...(status !== undefined && { status }), ...(publishedAt !== undefined && { publishedAt }) },
      });
    });

    const post = await this.prisma.post.findUnique({ where: { id }, include: POST_INCLUDE });
    return post ? mapPost(post) : null;
  }

  updateStatus(id: string, status: PostStatus) {
    const publishedAt = status === PostStatus.published ? new Date() : null;
    return this.prisma.post.update({
      where: { id },
      data: { status, publishedAt },
      include: POST_INCLUDE,
    }).then(mapPost);
  }

  delete(id: string) {
    return this.prisma.post.delete({ where: { id } });
  }

  findById(id: string) {
    return this.prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } });
  }

  async generateSlug(title: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });
    const existing = await this.prisma.post.findMany({
      where: { slug: { startsWith: base } },
      select: { slug: true },
    });
    if (!existing.find((p) => p.slug === base)) return base;
    let i = 2;
    while (existing.find((p) => p.slug === `${base}-${i}`)) i++;
    return `${base}-${i}`;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/posts/
git commit -m "feat(posts): add DTOs and PostsRepository"
```

---

## Task 7: Posts модуль — Service и Controllers

**Files:**
- Create: `src/posts/posts.service.ts`
- Create: `src/posts/posts.controller.ts`
- Create: `src/posts/posts.admin.controller.ts`
- Create: `src/posts/posts.module.ts`

- [ ] **Step 1: Создать PostsService**

`src/posts/posts.service.ts`:
```typescript
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PostsRepository } from './posts.repository';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UpdatePostStatusDto } from './dto/update-post-status.dto';
import { PostStatus, UserRole } from '@prisma/client';

@Injectable()
export class PostsService {
  constructor(private readonly repo: PostsRepository) {}

  findAllPublished(start: number, take: number, categorySlug?: string, tag?: string) {
    return this.repo.findAllPublished(start, take, categorySlug, tag);
  }

  async findBySlugPublished(slug: string) {
    const post = await this.repo.findBySlugPublished(slug);
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  findByAuthor(authorId: string, start: number, take: number) {
    return this.repo.findByAuthor(authorId, start, take);
  }

  async create(dto: CreatePostDto, authorId: string) {
    const slug = await this.repo.generateSlug(dto.title);
    return this.repo.create({
      title: dto.title,
      slug,
      content: dto.content,
      coverUrl: dto.coverUrl,
      status: dto.status ?? PostStatus.draft,
      authorId,
      categoryId: dto.categoryId,
      tagIds: dto.tagIds,
    });
  }

  async update(id: string, dto: UpdatePostDto, requesterId: string, requesterRole: UserRole) {
    const post = await this.repo.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== requesterId && requesterRole !== UserRole.admin) {
      throw new ForbiddenException('You can only edit your own posts');
    }
    return this.repo.update(id, dto);
  }

  async delete(id: string, requesterId: string, requesterRole: UserRole) {
    const post = await this.repo.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== requesterId && requesterRole !== UserRole.admin) {
      throw new ForbiddenException('You can only delete your own posts');
    }
    return this.repo.delete(id);
  }

  findAllAdmin(start: number, take: number, status?: PostStatus, categoryId?: string) {
    return this.repo.findAllAdmin(start, take, status, categoryId);
  }

  async updateStatus(id: string, dto: UpdatePostStatusDto) {
    const post = await this.repo.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    return this.repo.updateStatus(id, dto.status);
  }
}
```

- [ ] **Step 2: Создать PostsController (публичные + user endpoints)**

`src/posts/posts.controller.ts`:
```typescript
import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  HttpCode, HttpStatus, UseGuards, SkipThrottle,
  DefaultValuePipe, ParseIntPipe, Res, HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  // ── PUBLIC ──────────────────────────────────────────────────────────────────

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'List published posts (public)' })
  async findAll(
    @Query('_start', new DefaultValuePipe(0), ParseIntPipe) start: number,
    @Query('_end', new DefaultValuePipe(10), ParseIntPipe) end: number,
    @Query('categorySlug') categorySlug?: string,
    @Query('tag') tag?: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data, total } = await this.postsService.findAllPublished(start, end - start, categorySlug, tag);
    res.setHeader('X-Total-Count', total);
    return data;
  }

  // ── AUTHENTICATED ────────────────────────────────────────────────────────────
  // NOTE: /posts/me MUST be before /posts/:slug to avoid NestJS capturing "me" as slug param

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own posts including drafts' })
  async findMine(
    @CurrentUser() user: { sub: string },
    @Query('_start', new DefaultValuePipe(0), ParseIntPipe) start: number,
    @Query('_end', new DefaultValuePipe(10), ParseIntPipe) end: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data, total } = await this.postsService.findByAuthor(user.sub, start, end - start);
    res.setHeader('X-Total-Count', total);
    return data;
  }

  @Get(':slug')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get published post by slug (public)' })
  findOne(@Param('slug') slug: string) {
    return this.postsService.findBySlugPublished(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create post' })
  create(@Body() dto: CreatePostDto, @CurrentUser() user: { sub: string }) {
    return this.postsService.create(dto, user.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own post (admin can update any)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: { sub: string; role: string },
  ) {
    return this.postsService.update(id, dto, user.sub, user.role as any);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own post (admin can delete any)' })
  remove(@Param('id') id: string, @CurrentUser() user: { sub: string; role: string }) {
    return this.postsService.delete(id, user.sub, user.role as any);
  }
}
```

- [ ] **Step 3: Создать PostsAdminController**

`src/posts/posts.admin.controller.ts`:
```typescript
import {
  Controller, Get, Patch, Param, Body, Query,
  HttpCode, HttpStatus, UseGuards,
  DefaultValuePipe, ParseIntPipe, Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { UpdatePostStatusDto } from './dto/update-post-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, PostStatus } from '@prisma/client';

@ApiTags('Posts (Admin)')
@Controller('posts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@ApiBearerAuth()
export class PostsAdminController {
  constructor(private readonly postsService: PostsService) {}

  // NOTE: this controller must be listed FIRST in PostsModule.controllers
  // to prevent /posts/:slug from swallowing /posts/admin

  @Get('admin')
  @ApiOperation({ summary: 'List all posts for admin panel' })
  async findAll(
    @Query('_start', new DefaultValuePipe(0), ParseIntPipe) start: number,
    @Query('_end', new DefaultValuePipe(10), ParseIntPipe) end: number,
    @Query('status') status?: PostStatus,
    @Query('categoryId') categoryId?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const { data, total } = await this.postsService.findAllAdmin(start, end - start, status, categoryId);
    res.setHeader('X-Total-Count', total);
    return data;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update post status (admin only)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePostStatusDto) {
    return this.postsService.updateStatus(id, dto);
  }
}
```

- [ ] **Step 4: Создать PostsModule**

`src/posts/posts.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { PostsAdminController } from './posts.admin.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PostsRepository } from './posts.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  // PostsAdminController FIRST — so /posts/admin is matched before /posts/:slug
  controllers: [PostsAdminController, PostsController],
  providers: [PostsService, PostsRepository, RolesGuard],
})
export class PostsModule {}
```

- [ ] **Step 5: Добавить PostsModule в AppModule**

```typescript
import { PostsModule } from './posts/posts.module';
// в imports:
PostsModule,
```

- [ ] **Step 6: Проверить компиляцию**

```bash
npm run build
```

Ожидаемый результат: сборка без ошибок.

- [ ] **Step 7: Быстро проверить публичный API**

```bash
# Запустить локально
npm run start:dev &
sleep 5

# Получить список постов (пусто но 200)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/posts
# Ожидаемый результат: 200

# Создать категорию (должно вернуть 401 без токена)
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/categories \
  -H "Content-Type: application/json" -d '{"name":"Новости"}'
# Ожидаемый результат: 401
```

- [ ] **Step 8: Commit**

```bash
git add src/posts/ src/app.module.ts
git commit -m "feat(posts): add Posts module with public, user and admin endpoints"
```

---

## Task 8: Admin panel — RichTextEditor компонент

**Files:**
- Create: `packages/admin/src/components/RichTextEditor.tsx`

- [ ] **Step 1: Создать RichTextEditor**

`packages/admin/src/components/RichTextEditor.tsx`:
```tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { Button, Upload, Space, Divider } from 'antd';
import {
  BoldOutlined, ItalicOutlined, UnderlineOutlined,
  OrderedListOutlined, UnorderedListOutlined, LinkOutlined, PictureOutlined,
} from '@ant-design/icons';
import { useApiUrl } from '@refinedev/core';
import axios from 'axios';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
}

export const RichTextEditor = ({ value, onChange }: RichTextEditorProps) => {
  const apiUrl = useApiUrl();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image.configure({ allowBase64: false }),
    ],
    content: value ?? '',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  if (!editor) return null;

  const uploadImage = async (file: File) => {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await axios.post(`${apiUrl}/uploads/image?folder=content`, formData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });
    const url = data?.data?.url ?? data?.url;
    if (url) editor.chain().focus().setImage({ src: url }).run();
    return false; // prevent default upload
  };

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #d9d9d9', background: '#fafafa' }}>
        <Space wrap size={4}>
          <Button
            size="small" type={editor.isActive('bold') ? 'primary' : 'default'}
            icon={<BoldOutlined />}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <Button
            size="small" type={editor.isActive('italic') ? 'primary' : 'default'}
            icon={<ItalicOutlined />}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <Button
            size="small" type={editor.isActive('underline') ? 'primary' : 'default'}
            icon={<UnderlineOutlined />}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          />
          <Divider type="vertical" />
          {['1', '2', '3'].map((level) => (
            <Button
              key={level} size="small"
              type={editor.isActive('heading', { level: Number(level) }) ? 'primary' : 'default'}
              onClick={() => editor.chain().focus().toggleHeading({ level: Number(level) as 1|2|3 }).run()}
            >
              H{level}
            </Button>
          ))}
          <Divider type="vertical" />
          <Button
            size="small" type={editor.isActive('bulletList') ? 'primary' : 'default'}
            icon={<UnorderedListOutlined />}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <Button
            size="small" type={editor.isActive('orderedList') ? 'primary' : 'default'}
            icon={<OrderedListOutlined />}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <Divider type="vertical" />
          <Button
            size="small" icon={<LinkOutlined />}
            onClick={() => {
              const url = window.prompt('URL ссылки');
              if (url) editor.chain().focus().setLink({ href: url }).run();
            }}
          />
          <Upload showUploadList={false} beforeUpload={uploadImage} accept="image/*">
            <Button size="small" icon={<PictureOutlined />} />
          </Upload>
        </Space>
      </div>
      {/* Editor */}
      <EditorContent
        editor={editor}
        style={{ padding: '12px 16px', minHeight: 300, outline: 'none' }}
      />
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/admin/src/components/RichTextEditor.tsx
git commit -m "feat(admin): add TipTap RichTextEditor component"
```

---

## Task 9: Admin panel — Posts страницы

**Files:**
- Create: `packages/admin/src/pages/posts/list.tsx`
- Create: `packages/admin/src/pages/posts/create.tsx`
- Create: `packages/admin/src/pages/posts/edit.tsx`
- Create: `packages/admin/src/pages/posts/index.tsx`

- [ ] **Step 1: Создать PostList**

`packages/admin/src/pages/posts/list.tsx`:
```tsx
import { useTable } from '@refinedev/antd';
import { useUpdate } from '@refinedev/core';
import { Table, Tag, Select, Space } from 'antd';
import { ShowButton, EditButton, DeleteButton } from '@refinedev/antd';
import dayjs from 'dayjs';

export const PostList = () => {
  const { tableProps } = useTable({ resource: 'posts/admin', syncWithLocation: true });
  const { mutate: updateStatus } = useUpdate();

  return (
    <Table {...tableProps} rowKey="id">
      <Table.Column dataIndex="title" title="Заголовок" />
      <Table.Column
        dataIndex={['author', 'email']} title="Автор"
        render={(email) => email ?? '—'}
      />
      <Table.Column
        dataIndex={['category', 'name']} title="Категория"
        render={(name) => name ?? '—'}
      />
      <Table.Column
        dataIndex="tags" title="Теги"
        render={(tags: { name: string }[]) =>
          tags?.map((t) => <Tag key={t.name}>{t.name}</Tag>)
        }
      />
      <Table.Column
        dataIndex="status" title="Статус"
        render={(status, record: any) => (
          <Select
            value={status}
            size="small"
            style={{ width: 130 }}
            onChange={(val) =>
              updateStatus({ resource: 'posts', id: `${record.id}/status`, values: { status: val } })
            }
            options={[
              { value: 'draft', label: <Tag color="default">Черновик</Tag> },
              { value: 'published', label: <Tag color="green">Опубликован</Tag> },
            ]}
          />
        )}
      />
      <Table.Column
        dataIndex="publishedAt" title="Дата публикации"
        render={(v) => v ? dayjs(v).format('DD.MM.YYYY HH:mm') : '—'}
      />
      <Table.Column
        title="Действия"
        render={(_, record: any) => (
          <Space>
            <EditButton hideText size="small" recordItemId={record.id} />
            <DeleteButton hideText size="small" recordItemId={record.id} />
          </Space>
        )}
      />
    </Table>
  );
};
```

- [ ] **Step 2: Создать PostCreate**

`packages/admin/src/pages/posts/create.tsx`:
```tsx
import { Create, useForm, useSelect } from '@refinedev/antd';
import { Form, Input, Select, Upload, Button, Row, Col } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useApiUrl } from '@refinedev/core';
import { RichTextEditor } from '../../components/RichTextEditor';
import axios from 'axios';

export const PostCreate = () => {
  const { formProps, saveButtonProps, form } = useForm({ resource: 'posts' });
  const apiUrl = useApiUrl();

  const { selectProps: categoryProps } = useSelect({
    resource: 'categories', optionLabel: 'name', optionValue: 'id',
  });
  const { selectProps: tagProps } = useSelect({
    resource: 'tags', optionLabel: 'name', optionValue: 'id',
  });

  const uploadCover = async (file: File) => {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await axios.post(`${apiUrl}/uploads/image?folder=covers`, formData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });
    const url = data?.data?.url ?? data?.url;
    form.setFieldValue('coverUrl', url);
    return false;
  };

  return (
    <Create saveButtonProps={saveButtonProps}
      footerButtons={
        <Row gutter={8}>
          <Col>
            <Button onClick={() => { form.setFieldValue('status', 'draft'); form.submit(); }}>
              Черновик
            </Button>
          </Col>
          <Col>
            <Button type="primary" onClick={() => { form.setFieldValue('status', 'published'); form.submit(); }}>
              Опубликовать
            </Button>
          </Col>
        </Row>
      }
    >
      <Form {...formProps} layout="vertical" initialValues={{ status: 'draft' }}>
        <Form.Item name="status" hidden><Input /></Form.Item>
        <Form.Item name="title" label="Заголовок" rules={[{ required: true }]}>
          <Input placeholder="Заголовок статьи" />
        </Form.Item>
        <Form.Item label="Обложка" name="coverUrl">
          <Upload showUploadList={false} beforeUpload={uploadCover} accept="image/*">
            <Button icon={<UploadOutlined />}>Загрузить обложку</Button>
          </Upload>
        </Form.Item>
        <Form.Item name="categoryId" label="Категория">
          <Select {...categoryProps} allowClear placeholder="Выберите категорию" />
        </Form.Item>
        <Form.Item name="tagIds" label="Теги">
          <Select {...tagProps} mode="multiple" allowClear placeholder="Выберите теги" />
        </Form.Item>
        <Form.Item name="content" label="Содержание" rules={[{ required: true }]}>
          <RichTextEditor />
        </Form.Item>
      </Form>
    </Create>
  );
};
```

- [ ] **Step 3: Создать PostEdit**

`packages/admin/src/pages/posts/edit.tsx`:
```tsx
import { Edit, useForm, useSelect } from '@refinedev/antd';
import { Form, Input, Select, Upload, Button, Row, Col } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { useApiUrl } from '@refinedev/core';
import { RichTextEditor } from '../../components/RichTextEditor';
import axios from 'axios';

export const PostEdit = () => {
  const { formProps, saveButtonProps, form } = useForm({ resource: 'posts' });
  const apiUrl = useApiUrl();

  const { selectProps: categoryProps } = useSelect({
    resource: 'categories', optionLabel: 'name', optionValue: 'id',
  });
  const { selectProps: tagProps } = useSelect({
    resource: 'tags', optionLabel: 'name', optionValue: 'id',
  });

  const uploadCover = async (file: File) => {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await axios.post(`${apiUrl}/uploads/image?folder=covers`, formData, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
    });
    const url = data?.data?.url ?? data?.url;
    form.setFieldValue('coverUrl', url);
    return false;
  };

  return (
    <Edit saveButtonProps={saveButtonProps}
      footerButtons={
        <Row gutter={8}>
          <Col>
            <Button onClick={() => { form.setFieldValue('status', 'draft'); form.submit(); }}>
              Черновик
            </Button>
          </Col>
          <Col>
            <Button type="primary" onClick={() => { form.setFieldValue('status', 'published'); form.submit(); }}>
              Опубликовать
            </Button>
          </Col>
        </Row>
      }
    >
      <Form {...formProps} layout="vertical">
        <Form.Item name="status" hidden><Input /></Form.Item>
        <Form.Item name="title" label="Заголовок" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Обложка" name="coverUrl">
          <Upload showUploadList={false} beforeUpload={uploadCover} accept="image/*">
            <Button icon={<UploadOutlined />}>Заменить обложку</Button>
          </Upload>
        </Form.Item>
        <Form.Item name="categoryId" label="Категория">
          <Select {...categoryProps} allowClear />
        </Form.Item>
        <Form.Item name="tagIds" label="Теги">
          <Select {...tagProps} mode="multiple" allowClear />
        </Form.Item>
        <Form.Item name="content" label="Содержание" rules={[{ required: true }]}>
          <RichTextEditor />
        </Form.Item>
      </Form>
    </Edit>
  );
};
```

- [ ] **Step 4: Создать index.tsx**

`packages/admin/src/pages/posts/index.tsx`:
```tsx
export { PostList } from './list';
export { PostCreate } from './create';
export { PostEdit } from './edit';
```

- [ ] **Step 5: Commit**

```bash
git add packages/admin/src/pages/posts/
git commit -m "feat(admin): add Posts list/create/edit pages with TipTap"
```

---

## Task 10: Admin panel — Categories и Tags страницы

**Files:**
- Create: `packages/admin/src/pages/categories/list.tsx`
- Create: `packages/admin/src/pages/categories/index.tsx`
- Create: `packages/admin/src/pages/tags/list.tsx`
- Create: `packages/admin/src/pages/tags/index.tsx`

- [ ] **Step 1: Создать CategoryList**

`packages/admin/src/pages/categories/list.tsx`:
```tsx
import { useState } from 'react';
import { useTable } from '@refinedev/antd';
import { useCreate, useInvalidate } from '@refinedev/core';
import { Table, Space, Button, Modal, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DeleteButton } from '@refinedev/antd';

export const CategoryList = () => {
  const { tableProps } = useTable({ resource: 'categories', syncWithLocation: true });
  const { mutate: createCategory, isLoading } = useCreate();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const handleCreate = (values: { name: string }) => {
    createCategory(
      { resource: 'categories', values },
      {
        onSuccess: () => {
          form.resetFields();
          setOpen(false);
          invalidate({ resource: 'categories', invalidates: ['list'] });
        },
      },
    );
  };

  return (
    <>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Добавить категорию
        </Button>
      </div>
      <Modal
        title="Новая категория" open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={isLoading}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input placeholder="Новости" />
          </Form.Item>
        </Form>
      </Modal>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Название" />
        <Table.Column dataIndex="slug" title="Slug" />
        <Table.Column
          title="Действия"
          render={(_, record: any) => (
            <Space>
              <DeleteButton hideText size="small" recordItemId={record.id} resource="categories" />
            </Space>
          )}
        />
      </Table>
    </>
  );
};
```

- [ ] **Step 2: Создать categories/index.tsx**

`packages/admin/src/pages/categories/index.tsx`:
```tsx
export { CategoryList } from './list';
```

- [ ] **Step 3: Создать TagList**

`packages/admin/src/pages/tags/list.tsx`:
```tsx
import { useState } from 'react';
import { useTable } from '@refinedev/antd';
import { useCreate, useInvalidate } from '@refinedev/core';
import { Table, Space, Button, Modal, Form, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { DeleteButton } from '@refinedev/antd';

export const TagList = () => {
  const { tableProps } = useTable({ resource: 'tags', syncWithLocation: true });
  const { mutate: createTag, isLoading } = useCreate();
  const invalidate = useInvalidate();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();

  const handleCreate = (values: { name: string }) => {
    createTag(
      { resource: 'tags', values },
      {
        onSuccess: () => {
          form.resetFields();
          setOpen(false);
          invalidate({ resource: 'tags', invalidates: ['list'] });
        },
      },
    );
  };

  return (
    <>
      <div style={{ marginBottom: 16, textAlign: 'right' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          Добавить тег
        </Button>
      </div>
      <Modal
        title="Новый тег" open={open} onCancel={() => setOpen(false)}
        onOk={() => form.submit()} confirmLoading={isLoading}
      >
        <Form form={form} onFinish={handleCreate} layout="vertical">
          <Form.Item name="name" label="Название" rules={[{ required: true }]}>
            <Input placeholder="обновление" />
          </Form.Item>
        </Form>
      </Modal>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Название" />
        <Table.Column dataIndex="slug" title="Slug" />
        <Table.Column
          title="Действия"
          render={(_, record: any) => (
            <Space>
              <DeleteButton hideText size="small" recordItemId={record.id} resource="tags" />
            </Space>
          )}
        />
      </Table>
    </>
  );
};
```

- [ ] **Step 4: Создать tags/index.tsx**

`packages/admin/src/pages/tags/index.tsx`:
```tsx
export { TagList } from './list';
```

- [ ] **Step 5: Commit**

```bash
git add packages/admin/src/pages/categories/ packages/admin/src/pages/tags/
git commit -m "feat(admin): add Categories and Tags list pages"
```

---

## Task 11: Admin panel — подключить ресурсы в App.tsx

**Files:**
- Modify: `packages/admin/src/App.tsx`

- [ ] **Step 1: Добавить импорты в App.tsx**

В начало файла добавить:
```tsx
import { PostList, PostCreate, PostEdit } from './pages/posts';
import { CategoryList } from './pages/categories';
import { TagList } from './pages/tags';
import { FileTextOutlined, AppstoreOutlined, TagsOutlined } from '@ant-design/icons';
```

- [ ] **Step 2: Добавить ресурсы в массив resources**

После существующего ресурса `users/refresh-tokens` добавить:
```tsx
{
  name: 'news',
  meta: { label: 'Новости', icon: <FileTextOutlined /> },
},
{
  name: 'posts/admin',
  list: '/posts',
  create: '/posts/create',
  edit: '/posts/:id/edit',
  meta: { label: 'Все статьи', icon: <FileTextOutlined />, parent: 'news' },
},
{
  name: 'categories',
  list: '/categories',
  meta: { label: 'Категории', icon: <AppstoreOutlined />, parent: 'news' },
},
{
  name: 'tags',
  list: '/tags',
  meta: { label: 'Теги', icon: <TagsOutlined />, parent: 'news' },
},
```

- [ ] **Step 3: Добавить маршруты в Routes**

Внутри защищённого блока `<Route element={<Authenticated ...>}>` добавить:
```tsx
<Route path="/posts" element={<PostList />} />
<Route path="/posts/create" element={<PostCreate />} />
<Route path="/posts/:id/edit" element={<PostEdit />} />
<Route path="/categories" element={<CategoryList />} />
<Route path="/tags" element={<TagList />} />
```

- [ ] **Step 4: Проверить сборку admin**

```bash
cd packages/admin && npm run build && cd ../..
```

Ожидаемый результат: успешная сборка.

- [ ] **Step 5: Commit**

```bash
git add packages/admin/src/App.tsx
git commit -m "feat(admin): wire Posts, Categories, Tags into sidebar and routes"
```

---

## Task 12: Docker — пересобрать образы и финальная проверка

**Files:** нет изменений, только проверка

- [ ] **Step 1: Пересобрать оба образа**

```bash
docker compose build api admin
```

Ожидаемый результат: оба образа собираются без ошибок.

- [ ] **Step 2: Запустить все сервисы**

```bash
docker compose up -d api admin
```

- [ ] **Step 3: Проверить публичный API**

```bash
# Список постов
curl -s -w "\nHTTP: %{http_code}" http://localhost:3000/posts
# Ожидаемый: HTTP: 200, body: {"data":[],"message":"success"}

# Категории
curl -s -w "\nHTTP: %{http_code}" http://localhost:3000/categories
# Ожидаемый: HTTP: 200

# Теги
curl -s -w "\nHTTP: %{http_code}" http://localhost:3000/tags
# Ожидаемый: HTTP: 200
```

- [ ] **Step 4: Проверить admin панель**

Открыть `http://localhost:8080` → войти → в сайдбаре должна появиться группа "Новости" с тремя подразделами.

- [ ] **Step 5: Создать тестовую категорию через Swagger**

Открыть `http://localhost:3000/api/docs`, авторизоваться с токеном admin, создать категорию `POST /categories` `{"name": "Новости"}`.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: verify docker build with news module"
```
