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
import * as bcrypt from 'bcrypt';
import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

const mockUsersService = {
  findByEmail: jest.fn(),
  create: jest.fn(),
};

const mockPrisma = {
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
      ],
    }).compile();
    service = module.get(AuthService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('creates user and returns tokens when email is new', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue({ id: '1', email: 'a@b.com', role: 'user' });
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register('a@b.com', 'Pass123!');

      expect(mockUsersService.create).toHaveBeenCalled();
      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('throws 409 when user already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
      });
      await expect(service.register('a@b.com', 'Pass123!')).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        password: '$hashed$',
        role: 'user',
      });
      mockPrisma.refreshToken.create.mockResolvedValue({});
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('a@b.com', 'Pass123!');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
    });

    it('throws 401 on wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        id: '1',
        email: 'a@b.com',
        password: '$hashed$',
        role: 'user',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('a@b.com', 'Pass123!')).rejects.toThrow(UnauthorizedException);
    });

    it('throws 401 when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(service.login('a@b.com', 'Pass123!')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('returns new access token on valid refresh token', async () => {
      mockPrisma.refreshToken.findFirst.mockResolvedValue({
        userId: '1',
        token: 'valid-token',
        revoked: false,
        expiresAt: new Date(Date.now() + 86400000),
        user: { id: '1', role: 'user' },
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
