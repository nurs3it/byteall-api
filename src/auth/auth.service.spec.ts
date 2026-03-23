// Mock bcrypt to avoid slow real hashing in unit tests (rounds=12 takes ~15s each)
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$hashed$'),
  compare: jest.fn(),
}));

import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email/email.service';
import { SmsService } from '../notifications/sms/sms.service';
import * as bcrypt from 'bcrypt';
import {
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  HttpException,
} from '@nestjs/common';

const mockUsersService = {
  findByEmail: jest.fn(),
  findByPhone: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockPrisma = {
  otpCode: {
    findFirst: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, any> = {
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL_DAYS: 30,
    };
    return config[key];
  }),
  getOrThrow: jest.fn((key: string) => {
    const config: Record<string, any> = { JWT_SECRET: 'test-secret' };
    return config[key];
  }),
};

const mockEmailService = { sendOtp: jest.fn() };
const mockSmsService = { sendOtp: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: SmsService, useValue: mockSmsService },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('registerEmail', () => {
    it('creates user and sends OTP when email is new', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({ id: '1', email: 'a@b.com' });
      mockPrisma.otpCode.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.otpCode.create.mockResolvedValue({});
      mockEmailService.sendOtp.mockResolvedValue(undefined);

      await service.registerEmail('a@b.com', 'Pass123!');

      expect(mockUsersService.create).toHaveBeenCalled();
      expect(mockEmailService.sendOtp).toHaveBeenCalled();
    });

    it('throws 409 when verified user already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        isVerified: true,
      });
      await expect(service.registerEmail('a@b.com', 'Pass123!')).rejects.toThrow(ConflictException);
    });

    it('deletes old unverified user and creates new on re-registration', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: 'old-id',
        email: 'a@b.com',
        isVerified: false,
      });
      mockUsersService.delete.mockResolvedValue({});
      mockUsersService.create.mockResolvedValue({ id: 'new-id', email: 'a@b.com' });
      mockPrisma.otpCode.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.otpCode.create.mockResolvedValue({});
      mockEmailService.sendOtp.mockResolvedValue(undefined);

      await service.registerEmail('a@b.com', 'Pass123!');

      expect(mockUsersService.delete).toHaveBeenCalledWith('old-id');
      expect(mockUsersService.create).toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('throws 400 when no active OTP found', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' });
      mockPrisma.otpCode.findFirst.mockResolvedValue(null);

      await expect(service.verifyOtp('a@b.com', '123456', 'email_verify')).rejects.toThrow(
        HttpException,
      );
    });

    it('increments attempts and throws 400 on wrong code', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' });
      mockPrisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        codeHash: '$hashed$',
        attempts: 0,
        expiresAt: new Date(Date.now() + 600000),
      });
      mockPrisma.otpCode.update.mockResolvedValue({});
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // wrong code

      await expect(service.verifyOtp('a@b.com', '123456', 'email_verify')).rejects.toThrow();

      expect(mockPrisma.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ attempts: 1 }),
        }),
      );
    });

    it('throws 429 when attempts >= 3', async () => {
      mockUsersService.findByEmail.mockResolvedValue({ id: '1', email: 'a@b.com' });
      mockPrisma.otpCode.findFirst.mockResolvedValue({
        id: 'otp-1',
        codeHash: '$hashed$',
        attempts: 3,
        expiresAt: new Date(Date.now() + 600000),
      });
      mockPrisma.otpCode.update.mockResolvedValue({});

      await expect(service.verifyOtp('a@b.com', '123456', 'email_verify')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('loginEmail', () => {
    it('returns tokens on valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        password: '$hashed$',
        isVerified: true,
        role: 'user',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // correct password

      const result = await service.loginEmail('a@b.com', 'Pass123!');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('throws 401 on wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        password: '$hashed$',
        isVerified: true,
        role: 'user',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false); // wrong password

      await expect(service.loginEmail('a@b.com', 'Pass123!')).rejects.toThrow(UnauthorizedException);
    });

    it('throws 403 when user is not verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        password: '$hashed$',
        isVerified: false,
        role: 'user',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true); // correct password, but unverified

      await expect(service.loginEmail('a@b.com', 'Pass123!')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refreshToken', () => {
    it('returns new access token on valid refresh token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        userId: '1',
        token: 'valid-token',
        revoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: '1', role: 'user', isVerified: true },
      });

      const result = await service.refreshToken('valid-token');
      expect(result).toHaveProperty('access_token');
    });

    it('throws 401 on invalid/revoked token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);
      await expect(service.refreshToken('bad-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes only the specified refresh token for the user', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('user-1', 'token-abc');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { token: 'token-abc', userId: 'user-1' },
        data: { revoked: true },
      });
    });
  });
});
