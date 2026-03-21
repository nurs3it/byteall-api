// Load test env BEFORE any AppModule import so ConfigModule/PrismaService picks it up
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/notifications/email/email.service';
import { SmsService } from '../src/notifications/sms/sms.service';
import { ThrottlerGuard, ThrottlerStorage } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue({ sendOtp: jest.fn() })
      .overrideProvider(SmsService)
      .useValue({ sendOtp: jest.fn() })
      .overrideProvider(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(APP_GUARD)
      .useValue({ canActivate: () => true })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: async () => ({ totalHits: 1, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 }),
        getRecord: async () => [],
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean tables before each test
    await prisma.refreshToken.deleteMany();
    await prisma.otpCode.deleteMany();
    await prisma.user.deleteMany();
  });

  // ─── Register Email ──────────────────────────────────────────────────────────

  describe('POST /auth/register/email', () => {
    it('201 — creates user and returns OTP message', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register/email')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toBe('OTP sent to email');

      const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
      expect(user).not.toBeNull();
      expect(user!.isVerified).toBe(false);
    });

    it('409 — returns conflict for verified existing email', async () => {
      await prisma.user.create({
        data: { email: 'test@example.com', password: 'hash', isVerified: true },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register/email')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      expect(res.status).toBe(409);
    });

    it('201 — allows re-registration for unverified email', async () => {
      await prisma.user.create({
        data: { email: 'test@example.com', password: 'hash', isVerified: false },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register/email')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      expect(res.status).toBe(201);
      const users = await prisma.user.findMany({ where: { email: 'test@example.com' } });
      expect(users.length).toBe(1);
    });

    it('400 — rejects weak password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register/email')
        .send({ email: 'test@example.com', password: 'weak' });

      expect(res.status).toBe(400);
    });
  });

  // ─── Verify OTP ─────────────────────────────────────────────────────────────

  describe('POST /auth/verify/otp', () => {
    it('200 — verifies OTP and returns tokens', async () => {
      // Register first
      await request(app.getHttpServer())
        .post('/auth/register/email')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      // Get the raw OTP code from DB (for test purposes, read the hash and bypass)
      const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
      const otpRecord = await prisma.otpCode.findFirst({ where: { userId: user!.id } });

      // We need the real code — in tests the EmailService is mocked
      // Inject a known code directly into the DB
      const bcrypt = require('bcrypt');
      const testCode = '123456';
      await prisma.otpCode.update({
        where: { id: otpRecord!.id },
        data: { codeHash: await bcrypt.hash(testCode, 10) },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/verify/otp')
        .send({ identifier: 'test@example.com', code: testCode, type: 'email_verify' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('access_token');
      expect(res.body.data).toHaveProperty('refresh_token');
    });

    it('400 — invalid OTP', async () => {
      await prisma.user.create({
        data: { email: 'test@example.com', password: 'hash' },
      });
      const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
      const bcrypt = require('bcrypt');
      await prisma.otpCode.create({
        data: {
          userId: user!.id,
          codeHash: await bcrypt.hash('999999', 10),
          type: 'email_verify',
          expiresAt: new Date(Date.now() + 600000),
        },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/verify/otp')
        .send({ identifier: 'test@example.com', code: '123456', type: 'email_verify' });

      expect(res.status).toBe(400);
    });
  });

  // ─── Login Email ─────────────────────────────────────────────────────────────

  describe('POST /auth/login/email', () => {
    it('200 — returns tokens on valid login', async () => {
      const bcrypt = require('bcrypt');
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('StrongPass123!', 12),
          isVerified: true,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('access_token');
    });

    it('401 — wrong password', async () => {
      const bcrypt = require('bcrypt');
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('StrongPass123!', 12),
          isVerified: true,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: 'test@example.com', password: 'WrongPass123!' });

      expect(res.status).toBe(401);
    });

    it('403 — unverified user', async () => {
      const bcrypt = require('bcrypt');
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('StrongPass123!', 12),
          isVerified: false,
        },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      expect(res.status).toBe(403);
    });
  });

  // ─── Token Refresh ───────────────────────────────────────────────────────────

  describe('POST /auth/token/refresh', () => {
    it('200 — returns new access token', async () => {
      const bcrypt = require('bcrypt');
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('StrongPass123!', 12),
          isVerified: true,
        },
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      const refreshToken = loginRes.body.data.refresh_token;

      const res = await request(app.getHttpServer())
        .post('/auth/token/refresh')
        .send({ refresh_token: refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('access_token');
    });

    it('401 — invalid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/token/refresh')
        .send({ refresh_token: '00000000-0000-4000-8000-000000000000' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Logout ──────────────────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('200 — revokes refresh token', async () => {
      const bcrypt = require('bcrypt');
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('StrongPass123!', 12),
          isVerified: true,
        },
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      const { access_token, refresh_token } = loginRes.body.data;

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${access_token}`)
        .send({ refresh_token });

      expect(res.status).toBe(200);
    });

    it('401 — unauthorized without JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .send({ refresh_token: '00000000-0000-4000-8000-000000000000' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Register Phone ──────────────────────────────────────────────────────────

  describe('POST /auth/register/phone', () => {
    it('201 — creates user and returns OTP message', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register/phone')
        .send({ phone: '+77001234567', password: 'StrongPass123!' });

      expect(res.status).toBe(201);
      expect(res.body.data.message).toBe('OTP sent to phone');

      const user = await prisma.user.findUnique({ where: { phone: '+77001234567' } });
      expect(user).not.toBeNull();
      expect(user!.isVerified).toBe(false);
    });

    it('409 — returns conflict for verified existing phone', async () => {
      await prisma.user.create({
        data: { phone: '+77001234567', password: 'hash', isVerified: true },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register/phone')
        .send({ phone: '+77001234567', password: 'StrongPass123!' });

      expect(res.status).toBe(409);
    });

    it('201 — allows re-registration for unverified phone', async () => {
      await prisma.user.create({
        data: { phone: '+77001234567', password: 'hash', isVerified: false },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/register/phone')
        .send({ phone: '+77001234567', password: 'StrongPass123!' });

      expect(res.status).toBe(201);
      const users = await prisma.user.findMany({ where: { phone: '+77001234567' } });
      expect(users.length).toBe(1);
    });
  });

  // ─── Login Phone ─────────────────────────────────────────────────────────────

  describe('POST /auth/login/phone', () => {
    it('200 — sends OTP for verified phone user', async () => {
      await prisma.user.create({
        data: { phone: '+77001234567', password: 'hash', isVerified: true },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login/phone')
        .send({ phone: '+77001234567' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('OTP sent to phone');
    });

    it('401 — user not found', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login/phone')
        .send({ phone: '+77009999999' });

      expect(res.status).toBe(401);
    });

    it('401 — unverified user', async () => {
      await prisma.user.create({
        data: { phone: '+77001234567', password: 'hash', isVerified: false },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login/phone')
        .send({ phone: '+77001234567' });

      expect(res.status).toBe(401);
    });
  });

  // ─── Resend OTP ──────────────────────────────────────────────────────────────

  describe('POST /auth/otp/resend', () => {
    it('200 — resends OTP after cooldown has passed', async () => {
      // Register to create user and initial OTP
      await request(app.getHttpServer())
        .post('/auth/register/email')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      // Backdate the OTP so the 60s cooldown has expired
      const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
      await prisma.otpCode.updateMany({
        where: { userId: user!.id },
        data: { createdAt: new Date(Date.now() - 61000) },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/otp/resend')
        .send({ identifier: 'test@example.com', type: 'email_verify' });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('OTP resent');
    });

    it('429 — cooldown active (OTP created less than 60s ago)', async () => {
      // Register to create user and fresh OTP
      await request(app.getHttpServer())
        .post('/auth/register/email')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      // The OTP was just created — within the 60s cooldown window
      const res = await request(app.getHttpServer())
        .post('/auth/otp/resend')
        .send({ identifier: 'test@example.com', type: 'email_verify' });

      expect(res.status).toBe(429);
    });
  });

  // ─── GET /auth/me ────────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('200 — returns user profile', async () => {
      const bcrypt = require('bcrypt');
      await prisma.user.create({
        data: {
          email: 'test@example.com',
          password: await bcrypt.hash('StrongPass123!', 12),
          isVerified: true,
        },
      });

      const loginRes = await request(app.getHttpServer())
        .post('/auth/login/email')
        .send({ email: 'test@example.com', password: 'StrongPass123!' });

      expect(loginRes.status).toBe(200);
      const { access_token } = loginRes.body.data;

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${access_token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('email', 'test@example.com');
      expect(res.body.data).not.toHaveProperty('password');
    });

    it('401 — unauthorized without JWT', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
