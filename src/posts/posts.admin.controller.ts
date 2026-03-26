import {
  Controller, Get, Patch, Param, Body, Query,
  UseGuards, DefaultValuePipe, ParseIntPipe, Res,
} from '@nestjs/common';
import type { Response } from 'express';
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
    @Res({ passthrough: true }) res: Response,
    @Query('status') status?: PostStatus,
    @Query('categoryId') categoryId?: string,
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
