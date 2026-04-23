import {
  Controller, Get, Post, Body, Query, Res, UseGuards, Delete,
} from '@nestjs/common';
import type { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { LinkedInService } from './linkedin.service';
import { randomUUID } from 'crypto';

@SkipThrottle()
@Controller('linkedin')
export class LinkedInController {
  constructor(private readonly linkedIn: LinkedInService) {}

  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const adminUrl = process.env.ADMIN_URL || 'http://localhost:5173';
    if (error || !code) {
      return res.redirect(`${adminUrl}/settings/linkedin?error=${error || 'no_code'}`);
    }

    try {
      await this.linkedIn.exchangeCode(code);
      return res.redirect(`${adminUrl}/settings/linkedin?success=true`);
    } catch (e) {
      return res.redirect(`${adminUrl}/settings/linkedin?error=${encodeURIComponent(e.message)}`);
    }
  }

  @Get('status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  getStatus() {
    return this.linkedIn.getStatus();
  }

  @Get('auth-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  getAuthUrl() {
    if (!this.linkedIn.isConfigured()) {
      return { error: 'LinkedIn client credentials not configured' };
    }
    const state = randomUUID();
    return { url: this.linkedIn.getAuthUrl(state), state };
  }

  @Post('organization')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  async setOrganization(@Body('organizationId') organizationId: string) {
    await this.linkedIn.setOrganizationId(organizationId);
    return { success: true };
  }

  @Delete('disconnect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  async disconnect() {
    await this.linkedIn.disconnect();
    return { success: true };
  }

  @Post('test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.admin)
  async testShare() {
    const result = await this.linkedIn.shareArticle({
      title: 'Test Post from ByteAll Energy',
      description: 'This is a test post to verify LinkedIn integration.',
      articleUrl: 'https://byteallenergy.com',
    });
    return { success: true, postId: result };
  }
}
