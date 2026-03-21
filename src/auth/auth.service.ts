import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../notifications/email/email.service';
import { SmsService } from '../notifications/sms/sms.service';
import * as bcrypt from 'bcrypt';
import { randomUUID, randomInt } from 'crypto';
import { OtpType } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  // ─── Registration ──────────────────────────────────────────────────────

  async registerEmail(email: string, password: string): Promise<void> {
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      if (existing.isVerified) throw new ConflictException('Email already in use');
      await this.usersService.delete(existing.id);
    }
    const hash = await bcrypt.hash(password, 12);
    const user = await this.usersService.create({ email, password: hash });
    await this.sendOtp(user.id, email, 'email_verify');
  }

  async registerPhone(phone: string, password: string): Promise<void> {
    const existing = await this.usersService.findByPhone(phone);
    if (existing) {
      if (existing.isVerified) throw new ConflictException('Phone already in use');
      await this.usersService.delete(existing.id);
    }
    const hash = await bcrypt.hash(password, 12);
    const user = await this.usersService.create({ phone, password: hash });
    await this.sendOtp(user.id, phone, 'phone_verify');
  }

  // ─── OTP ───────────────────────────────────────────────────────────────

  async verifyOtp(identifier: string, code: string, type: OtpType) {
    const user = identifier.includes('@')
      ? await this.usersService.findByEmail(identifier)
      : await this.usersService.findByPhone(identifier);

    if (!user) throw new NotFoundException('User not found');

    const otpRecord = await this.prisma.otpCode.findFirst({
      where: {
        userId: user.id,
        type: type,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new HttpException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }

    if (otpRecord.attempts >= 3) {
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { used: true },
      });
      throw new HttpException('Too many attempts. Request a new OTP.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const isValid = await bcrypt.compare(code, otpRecord.codeHash);
    if (!isValid) {
      const newAttempts = otpRecord.attempts + 1;
      await this.prisma.otpCode.update({
        where: { id: otpRecord.id },
        data: { attempts: newAttempts, ...(newAttempts >= 3 ? { used: true } : {}) },
      });
      if (newAttempts >= 3) {
        throw new HttpException(
          'Too many attempts. Request a new OTP.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new HttpException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }

    await this.prisma.otpCode.update({
      where: { id: otpRecord.id },
      data: { used: true },
    });

    if (type !== 'phone_login') {
      await this.usersService.update(user.id, { isVerified: true });
    }

    return this.issueTokens(user);
  }

  async resendOtp(identifier: string, type: OtpType): Promise<void> {
    const user = identifier.includes('@')
      ? await this.usersService.findByEmail(identifier)
      : await this.usersService.findByPhone(identifier);

    if (!user) throw new NotFoundException('User not found');

    // 60-second cooldown
    const recent = await this.prisma.otpCode.findFirst({
      where: { userId: user.id, type: type },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      const secondsAgo = (Date.now() - recent.createdAt.getTime()) / 1000;
      if (secondsAgo < 60) {
        throw new HttpException(
          'Please wait before requesting a new OTP',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Invalidate previous OTPs
    await this.prisma.otpCode.updateMany({
      where: { userId: user.id, type: type, used: false },
      data: { used: true },
    });

    await this.sendOtp(user.id, identifier, type);
  }

  // ─── Login ─────────────────────────────────────────────────────────────

  async loginEmail(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) throw new ForbiddenException('Email not verified');

    return this.issueTokens(user);
  }

  async loginPhone(phone: string): Promise<void> {
    const user = await this.usersService.findByPhone(phone);
    if (!user || !user.isVerified) throw new UnauthorizedException('Invalid credentials');
    await this.sendOtp(user.id, phone, 'phone_login');
  }

  // ─── Token management ──────────────────────────────────────────────────

  async refreshToken(token: string) {
    const record = await this.prisma.refreshToken.findFirst({
      where: { token, revoked: false, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!record) throw new UnauthorizedException('Invalid refresh token');

    const accessToken = this.jwtService.sign(
      { sub: record.user.id, role: record.user.role, is_verified: record.user.isVerified },
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

  private async sendOtp(userId: string, destination: string, type: OtpType): Promise<void> {
    const code = randomInt(100000, 1000000).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpCode.updateMany({
      where: { userId, type: type, used: false },
      data: { used: true },
    });

    await this.prisma.otpCode.create({
      data: { userId, codeHash, type: type, expiresAt },
    });

    if (destination.includes('@')) {
      await this.emailService.sendOtp(destination, code);
    } else {
      await this.smsService.sendOtp(destination, code);
    }
  }

  private async issueTokens(user: {
    id: string;
    role: string;
    isVerified: boolean;
    email?: string | null;
    phone?: string | null;
  }) {
    const accessToken = this.jwtService.sign(
      { sub: user.id, role: user.role, is_verified: user.isVerified },
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
        phone: user.phone ?? null,
        role: user.role,
      },
    };
  }
}
