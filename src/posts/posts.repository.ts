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
    title: string; slug: string; content: string; coverUrl?: string; authorName?: string;
    status: PostStatus; authorId: string; categoryId?: string; tagIds?: string[];
  }) {
    const { tagIds, ...rest } = data;
    const post = await this.prisma.post.create({
      data: {
        ...rest,
        id: randomUUID(),
        publishedAt: data.status === PostStatus.published ? new Date() : null,
        tags: tagIds?.length
          ? { create: tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: POST_INCLUDE,
    });
    return mapPost(post);
  }

  async update(id: string, data: {
    title?: string; content?: string; coverUrl?: string; authorName?: string;
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

  async updateStatus(id: string, status: PostStatus) {
    const current = await this.prisma.post.findUnique({ where: { id }, select: { status: true, publishedAt: true } });
    const publishedAt =
      status === PostStatus.published && current?.status !== PostStatus.published
        ? new Date()
        : status === PostStatus.draft
          ? null
          : undefined;

    const post = await this.prisma.post.update({
      where: { id },
      data: { status, ...(publishedAt !== undefined && { publishedAt }) },
      include: POST_INCLUDE,
    });
    return mapPost(post);
  }

  delete(id: string) {
    return this.prisma.post.delete({ where: { id } });
  }

  findById(id: string) {
    return this.prisma.post.findUnique({ where: { id }, select: { id: true, authorId: true } });
  }

  async getStats() {
    const [total, published, draft, categories, tags] = await this.prisma.$transaction([
      this.prisma.post.count(),
      this.prisma.post.count({ where: { status: PostStatus.published } }),
      this.prisma.post.count({ where: { status: PostStatus.draft } }),
      this.prisma.category.count(),
      this.prisma.tag.count(),
    ]);
    return { total, published, draft, categories, tags };
  }

  async generateSlug(title: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });
    const exists = await this.prisma.post.findUnique({ where: { slug: base }, select: { id: true } });
    if (!exists) return base;
    let i = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = `${base}-${i}`;
      const taken = await this.prisma.post.findUnique({ where: { slug: candidate }, select: { id: true } });
      if (!taken) return candidate;
      i++;
    }
  }
}
