import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query,
  UseGuards, DefaultValuePipe, ParseIntPipe, ParseEnumPipe, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VacanciesService } from './vacancies.service';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, VacancyStatus } from '@prisma/client';

@ApiTags('Vacancies (Admin)')
@Controller('vacancies')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@ApiBearerAuth()
export class VacanciesAdminController {
  constructor(private readonly vacanciesService: VacanciesService) {}

  @Get('admin/stats')
  @ApiOperation({ summary: 'Get vacancy statistics' })
  getStats() {
    return this.vacanciesService.getStats();
  }

  @Get('admin')
  @ApiOperation({ summary: 'List all vacancies for admin' })
  async findAll(
    @Query('_start', new DefaultValuePipe(0), ParseIntPipe) start: number,
    @Query('_end', new DefaultValuePipe(10), ParseIntPipe) end: number,
    @Res({ passthrough: true }) res: Response,
    @Query('status', new ParseEnumPipe(VacancyStatus, { optional: true })) status?: VacancyStatus,
    @Query('department') department?: string,
  ) {
    const { data, total } = await this.vacanciesService.findAllAdmin(start, end - start, status, department);
    res.setHeader('X-Total-Count', total);
    return data;
  }

  @Get('admin/:id')
  @ApiOperation({ summary: 'Get vacancy by ID for admin' })
  findOne(@Param('id') id: string) {
    return this.vacanciesService.findByIdAdmin(id);
  }

  @Post('admin')
  @ApiOperation({ summary: 'Create a vacancy' })
  create(@Body() dto: CreateVacancyDto) {
    return this.vacanciesService.create(dto);
  }

  @Patch('admin/:id')
  @ApiOperation({ summary: 'Update a vacancy' })
  update(@Param('id') id: string, @Body() dto: UpdateVacancyDto) {
    return this.vacanciesService.update(id, dto);
  }

  @Delete('admin/:id')
  @ApiOperation({ summary: 'Delete a vacancy' })
  delete(@Param('id') id: string) {
    return this.vacanciesService.delete(id);
  }
}
