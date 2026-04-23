import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface ShareArticleParams {
  title: string;
  description: string;
  articleUrl: string;
  thumbnailUrl?: string;
}

interface LinkedInTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  organizationId?: string;
}

@Injectable()
export class LinkedInService {
  private readonly logger = new Logger(LinkedInService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly apiVersion = '202504';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.clientId = this.config.get('LINKEDIN_CLIENT_ID', '');
    this.clientSecret = this.config.get('LINKEDIN_CLIENT_SECRET', '');
    this.redirectUri = this.config.get('LINKEDIN_REDIRECT_URI', 'http://localhost:3000/linkedin/callback');
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  getAuthUrl(state: string): string {
    const scopes = 'w_organization_social r_organization_social rw_organization_admin';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state,
      scope: scopes,
    });
    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<LinkedInTokenData> {
    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      }).toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`LinkedIn token exchange failed: ${res.status} ${body}`);
    }

    const data = await res.json();
    const expiresAt = new Date(Date.now() + data.expires_in * 1000);

    const tokenData: LinkedInTokenData = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || undefined,
      expiresAt,
    };

    await this.saveToken(tokenData);
    return tokenData;
  }

  async refreshAccessToken(): Promise<void> {
    const token = await this.getToken();
    if (!token?.refreshToken) {
      throw new Error('No refresh token available');
    }

    const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`LinkedIn token refresh failed: ${res.status} ${body}`);
    }

    const data = await res.json();
    await this.saveToken({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || token.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      organizationId: token.organizationId ?? undefined,
    });
  }

  async shareArticle(params: ShareArticleParams): Promise<string | null> {
    const token = await this.getValidToken();
    if (!token) {
      this.logger.warn('No valid LinkedIn token, skipping share');
      return null;
    }

    if (!token.organizationId) {
      this.logger.warn('No LinkedIn organization ID configured, skipping share');
      return null;
    }

    const body = {
      author: `urn:li:organization:${token.organizationId}`,
      commentary: params.description,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
      },
      content: {
        article: {
          source: params.articleUrl,
          title: params.title,
          description: params.description.slice(0, 256),
          ...(params.thumbnailUrl && { thumbnail: params.thumbnailUrl }),
        },
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    };

    const res = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': this.apiVersion,
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`LinkedIn share failed: ${res.status} ${errorBody}`);
    }

    const postId = res.headers.get('x-restli-id') || res.headers.get('x-linkedin-id') || null;
    return postId;
  }

  async setOrganizationId(organizationId: string): Promise<void> {
    const token = await this.getToken();
    if (token) {
      await this.prisma.linkedInToken.update({
        where: { id: 'singleton' },
        data: { organizationId },
      });
    }
  }

  async getStatus(): Promise<{
    connected: boolean;
    organizationId: string | null;
    expiresAt: Date | null;
    isExpired: boolean;
  }> {
    const token = await this.getToken();
    if (!token) {
      return { connected: false, organizationId: null, expiresAt: null, isExpired: false };
    }
    return {
      connected: true,
      organizationId: token.organizationId,
      expiresAt: token.expiresAt,
      isExpired: token.expiresAt < new Date(),
    };
  }

  async disconnect(): Promise<void> {
    await this.prisma.linkedInToken.deleteMany({ where: { id: 'singleton' } });
  }

  private async getToken() {
    return this.prisma.linkedInToken.findUnique({ where: { id: 'singleton' } });
  }

  private async getValidToken() {
    const token = await this.getToken();
    if (!token) return null;

    if (token.expiresAt < new Date()) {
      if (token.refreshToken) {
        try {
          await this.refreshAccessToken();
          return this.getToken();
        } catch (e) {
          this.logger.error(`Token refresh failed: ${e.message}`);
          return null;
        }
      }
      return null;
    }

    return token;
  }

  private async saveToken(data: LinkedInTokenData): Promise<void> {
    await this.prisma.linkedInToken.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        expiresAt: data.expiresAt,
        organizationId: data.organizationId ?? null,
      },
      update: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? undefined,
        expiresAt: data.expiresAt,
        ...(data.organizationId !== undefined && { organizationId: data.organizationId }),
      },
    });
  }
}
