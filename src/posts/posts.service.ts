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
