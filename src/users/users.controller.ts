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
import type { Response } from 'express';
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
