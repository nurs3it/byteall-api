import {
  Controller, Get, Post, Delete, Param, Body,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
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
