import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Body,
  Query,
  Res,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, InquiryStatus } from '@prisma/client';
import { InquiriesService } from './inquiries.service';
import { UpdateInquiryStatusDto } from './dto/update-inquiry-status.dto';

@SkipThrottle()
@Controller('inquiries/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class InquiriesAdminController {
  constructor(private service: InquiriesService) {}

  @Get('stats')
  getStats() {
    return this.service.getStats();
  }

  @Get()
  async findAll(
    @Query('_start') start?: string,
    @Query('_end') end?: string,
    @Query('status') status?: InquiryStatus,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const skip = parseInt(start || '0', 10);
    const take = parseInt(end || '10', 10) - skip;
    const { data, total } = await this.service.findAll({ skip, take, status });
    res?.setHeader('X-Total-Count', total);
    return data;
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInquiryStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status, dto.notes);
  }

  @Delete(':id')
  delete(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.delete(id);
  }
}
