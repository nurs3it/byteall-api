import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type ServiceStatus = {
  status: 'up' | 'down';
  latencyMs?: number;
  message?: string;
};

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async check() {
    const [database] = await Promise.all([this.checkDatabase()]);

    const services: Record<string, ServiceStatus> = {
      api: { status: 'up' },
      database,
    };

    const overall = Object.values(services).every((s) => s.status === 'up')
      ? 'ok'
      : 'degraded';

    return {
      status: overall,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      version: process.env.npm_package_version ?? 'unknown',
      services,
    };
  }

  private async checkDatabase(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
      return {
        status: 'down',
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
