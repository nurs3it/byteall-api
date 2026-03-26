import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  HttpCode, HttpStatus, UseGuards,
  DefaultValuePipe, ParseIntPipe, Res,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

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
    @Res({ passthrough: true }) res: Response,
    @Query('categorySlug') categorySlug?: string,
    @Query('tag') tag?: string,
  ) {
    const { data, total } = await this.postsService.findAllPublished(start, end - start, categorySlug, tag);
    res.setHeader('X-Total-Count', total);
    return data;
  }

  // ── AUTHENTICATED ─── NOTE: /posts/me MUST be before /posts/:slug ────────

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get own posts including drafts' })
  async findMine(
    @CurrentUser() user: User,
    @Query('_start', new DefaultValuePipe(0), ParseIntPipe) start: number,
    @Query('_end', new DefaultValuePipe(10), ParseIntPipe) end: number,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { data, total } = await this.postsService.findByAuthor(user.id, start, end - start);
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
  create(@Body() dto: CreatePostDto, @CurrentUser() user: User) {
    return this.postsService.create(dto, user.id, user.role);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own post (admin can update any)' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: User,
  ) {
    return this.postsService.update(id, dto, user.id, user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own post (admin can delete any)' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.postsService.delete(id, user.id, user.role);
  }
}
