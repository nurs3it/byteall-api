import { ForbiddenException, Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PostsRepository } from './posts.repository';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { UpdatePostStatusDto } from './dto/update-post-status.dto';
import { PostStatus, UserRole } from '@prisma/client';
import { LinkedInService } from '../linkedin/linkedin.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PostsService {
  private readonly logger = new Logger(PostsService.name);
  private readonly siteUrl: string;

  constructor(
    private readonly repo: PostsRepository,
    @Optional() @Inject(LinkedInService) private readonly linkedIn: LinkedInService | null,
    private readonly config: ConfigService,
  ) {
    this.siteUrl = this.config.get('SITE_URL', 'https://byteallenergy.com');
  }

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

  async create(dto: CreatePostDto, authorId: string, requesterRole: UserRole) {
    const slug = await this.repo.generateSlug(dto.title);
    // Only admin can create directly as published
    const status = requesterRole === UserRole.admin && dto.status === PostStatus.published
      ? PostStatus.published
      : PostStatus.draft;
    const post = await this.repo.create({
      title: dto.title,
      slug,
      content: dto.content,
      excerpt: dto.excerpt,
      coverUrl: dto.coverUrl,
      authorName: dto.authorName,
      status,
      authorId,
      categoryId: dto.categoryId,
      tagIds: dto.tagIds,
    });

    if (status === PostStatus.published && dto.shareToLinkedIn) {
      this.shareToLinkedIn(post).catch(() => {});
    }

    return post;
  }

  async update(id: string, dto: UpdatePostDto, requesterId: string, requesterRole: UserRole) {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundException('Post not found');
    if (existing.authorId !== requesterId && requesterRole !== UserRole.admin) {
      throw new ForbiddenException('You can only edit your own posts');
    }
    const updated = await this.repo.update(id, dto);

    if (dto.status === PostStatus.published && dto.shareToLinkedIn && updated) {
      this.shareToLinkedIn(updated).catch(() => {});
    }

    return updated;
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

  getStats() {
    return this.repo.getStats();
  }

  async updateStatus(id: string, dto: UpdatePostStatusDto) {
    const post = await this.repo.findById(id);
    if (!post) throw new NotFoundException('Post not found');
    return this.repo.updateStatus(id, dto.status);
  }

  private async shareToLinkedIn(post: any) {
    if (!this.linkedIn) {
      this.logger.warn('LinkedIn service not available, skipping share');
      return;
    }

    try {
      const articleUrl = `${this.siteUrl}/news/${post.slug}`;
      const description = post.excerpt || post.title;

      const linkedinPostId = await this.linkedIn.shareArticle({
        title: post.title,
        description,
        articleUrl,
        thumbnailUrl: post.coverUrl || undefined,
      });

      if (linkedinPostId) {
        await this.repo.setLinkedInPostId(post.id, linkedinPostId);
        this.logger.log(`Post "${post.title}" shared to LinkedIn: ${linkedinPostId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to share post "${post.title}" to LinkedIn: ${error.message}`);
    }
  }
}
