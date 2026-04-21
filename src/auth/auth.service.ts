import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Registration ──────────────────────────────────────────────────────

  async register(email: string, password: string) {
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new ConflictException('Email already in use');

    const hash = await bcrypt.hash(password, 12);
    const user = await this.usersService.create({ email, password: hash });
    return this.issueTokens(user);
  }

  // ─── Login ─────────────────────────────────────────────────────────────

  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    return this.issueTokens(user);
  }

  // ─── Token management ──────────────────────────────────────────────────

  async refreshToken(token: string) {
    const record = await this.prisma.refreshToken.findFirst({
      where: { token, revoked: false, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!record) throw new UnauthorizedException('Invalid refresh token');

    const accessToken = this.jwtService.sign(
      { sub: record.user.id, role: record.user.role },
      { expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ?? '15m') as StringValue },
    );
    return { access_token: accessToken };
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken, userId },
      data: { revoked: true },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private async issueTokens(user: {
    id: string;
    role: string;
    email?: string | null;
  }) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, role: user.role },
      { expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ?? '15m') as StringValue },
    );

    const refreshToken = randomUUID();
    const days = this.config.get<number>('JWT_REFRESH_TTL_DAYS') ?? 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email ?? null,
        role: user.role,
      },
    };
  }
}
