import {
  Controller, Get, Patch, Delete,
  Param, Body, Query,
  UseGuards, DefaultValuePipe, ParseIntPipe, ParseEnumPipe, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ApplicationStatus } from '@prisma/client';

@ApiTags('Applications (Admin)')
@Controller('applications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
@ApiBearerAuth()
export class ApplicationsAdminController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get('admin/stats')
  @ApiOperation({ summary: 'Get application statistics' })
  getStats() {
    return this.applicationsService.getStats();
  }

  @Get('admin')
  @ApiOperation({ summary: 'List all applications for admin' })
  async findAll(
    @Query('_start', new DefaultValuePipe(0), ParseIntPipe) start: number,
    @Query('_end', new DefaultValuePipe(10), ParseIntPipe) end: number,
    @Res({ passthrough: true }) res: Response,
    @Query('status', new ParseEnumPipe(ApplicationStatus, { optional: true })) status?: ApplicationStatus,
    @Query('vacancyId') vacancyId?: string,
  ) {
    const { data, total } = await this.applicationsService.findAllAdmin(
      start, end - start, status, vacancyId,
    );
    res.setHeader('X-Total-Count', total);
    return data;
  }

  @Get('admin/:id')
  @ApiOperation({ summary: 'Get application by ID' })
  findOne(@Param('id') id: string) {
    return this.applicationsService.findByIdAdmin(id);
  }

  @Patch('admin/:id/status')
  @ApiOperation({ summary: 'Update application status' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(id, dto);
  }

  @Delete('admin/:id')
  @ApiOperation({ summary: 'Delete an application' })
  delete(@Param('id') id: string) {
    return this.applicationsService.delete(id);
  }
}
