# Auth Service Design

**Date:** 2026-03-21
**Project:** byteall-api
**Scope:** Authentication & Authorization module (Phase 1)

---

## Overview

A NestJS backend API with Supabase (PostgreSQL) as the database. Authentication is implemented entirely in NestJS — Supabase is used only as a managed PostgreSQL instance. Swagger is included for API documentation.

This spec covers Phase 1: the Auth service. Future phases will cover the admin panel and core business API.

---

## Tech Stack

- **Framework:** NestJS (TypeScript)
- **Database:** Supabase (PostgreSQL) via Prisma ORM
- **Auth strategy:** Custom JWT (Passport.js) + bcrypt
- **OTP delivery:** Email via SMTP (nodemailer), SMS via Twilio
- **API docs:** Swagger (`@nestjs/swagger`)
- **Testing:** Jest (unit), Supertest (e2e)

---

## Authentication Strategy

- **No Supabase Auth** — all auth logic lives in NestJS
- **Passwords** hashed with bcrypt (rounds: 12)
- **Access token:** JWT, TTL 15 minutes, payload: `{ sub, role, is_verified }`
- **Refresh token:** random UUID v4, TTL 30 days, stored in `refresh_tokens` table
- **Refresh token rotation:** disabled in v1 — same token is reused until logout or expiry; stolen token risk accepted given 30-day TTL and logout revocation
- **OTP codes:** 6-digit numeric, TTL 10 minutes, stored as bcrypt hash, max 3 attempts per code

---

## Database Schema

```sql
-- Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE,
  phone       TEXT UNIQUE,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OTP codes (one active record per user per type)
CREATE TABLE otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT NOT NULL,
  type        TEXT NOT NULL,   -- 'email_verify' | 'phone_verify' | 'phone_login'
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT false,
  attempts    INT NOT NULL DEFAULT 0,   -- per-code counter, max 3
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Project Structure

```
src/
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    strategies/
      jwt.strategy.ts
    guards/
      jwt-auth.guard.ts
      roles.guard.ts
    decorators/
      roles.decorator.ts
      current-user.decorator.ts
    dto/
      register-email.dto.ts
      register-phone.dto.ts
      verify-otp.dto.ts
      login-email.dto.ts
      login-phone.dto.ts
      refresh-token.dto.ts
      resend-otp.dto.ts
    interfaces/
      jwt-payload.interface.ts
  users/
    users.module.ts
    users.service.ts
    users.repository.ts
  common/
    filters/
      http-exception.filter.ts
    interceptors/
      response.interceptor.ts
  app.module.ts
  main.ts
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register/email` | Public | Register with email + password |
| POST | `/auth/register/phone` | Public | Register with phone + password |
| POST | `/auth/verify/otp` | Public | Verify OTP (email_verify or phone_verify) |
| POST | `/auth/login/email` | Public | Login with email + password |
| POST | `/auth/login/phone` | Public | Login with verified phone — sends OTP |
| POST | `/auth/otp/resend` | Public | Resend OTP (with cooldown) |
| POST | `/auth/token/refresh` | Public | Exchange refresh token for new access token |
| POST | `/auth/logout` | JWT | Revoke current device's refresh token |
| GET  | `/auth/me` | JWT | Get current user profile |

---

## Endpoint Contracts

### POST /auth/register/email
```json
// Request
{ "email": "user@example.com", "password": "StrongPass123!" }

// 201 — new user created, OTP sent
{ "data": { "message": "OTP sent to email" } }

// 409 — email already registered AND verified
{ "statusCode": 409, "message": "Email already in use", "error": "Conflict" }

// 409 — email registered but unverified (re-registration)
// Behaviour: delete old unverified record, create new user, send new OTP
{ "data": { "message": "OTP sent to email" } }
```

### POST /auth/register/phone
```json
// Request
{ "phone": "+77001234567", "password": "StrongPass123!" }

// Same 201 / 409 logic as email registration
```

### POST /auth/verify/otp
```json
// Request
{ "identifier": "user@example.com", "code": "123456", "type": "email_verify" }
// type: 'email_verify' | 'phone_verify'

// 200 — OTP valid, user verified, tokens issued
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "uuid-v4...",
    "user": { "id": "...", "email": "...", "phone": null, "role": "user" }
  }
}

// 400 — invalid or expired OTP
{ "statusCode": 400, "message": "Invalid or expired OTP", "error": "Bad Request" }

// 429 — max attempts exceeded (3 failed attempts on this code)
{ "statusCode": 429, "message": "Too many attempts. Request a new OTP.", "error": "Too Many Requests" }
```

### POST /auth/login/email
```json
// Request
{ "email": "user@example.com", "password": "StrongPass123!" }

// 200 — credentials valid, user is verified
{
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "uuid-v4...",
    "user": { "id": "...", "email": "...", "phone": null, "role": "user" }
  }
}

// 401 — wrong credentials
{ "statusCode": 401, "message": "Invalid credentials", "error": "Unauthorized" }

// 403 — correct credentials but email not verified
{ "statusCode": 403, "message": "Email not verified", "error": "Forbidden" }
```

### POST /auth/login/phone
```json
// Request
{ "phone": "+77001234567" }

// Precondition: phone must belong to a verified user
// 200 — OTP sent
{ "data": { "message": "OTP sent to phone" } }

// 404 — phone not found or user not verified
{ "statusCode": 404, "message": "User not found", "error": "Not Found" }
```

Phone login OTP is verified via `POST /auth/verify/otp` with `type: "phone_login"`.
After successful phone_login OTP verification, tokens are issued (user is already verified).

### POST /auth/otp/resend
```json
// Request
{ "identifier": "user@example.com", "type": "email_verify" }
// type: 'email_verify' | 'phone_verify' | 'phone_login'

// 200 — new OTP sent, previous OTP invalidated
{ "data": { "message": "OTP resent" } }

// 429 — cooldown active (60 seconds between resend requests per user per type)
{ "statusCode": 429, "message": "Please wait before requesting a new OTP", "error": "Too Many Requests" }
```

Resend rules:
- Invalidates previous active OTP for same user + type
- Resets the 3-attempt counter (new code, new counter)
- 60-second cooldown between resend calls (tracked by `created_at` of most recent OTP record)

### POST /auth/token/refresh
```json
// Request
{ "refresh_token": "uuid-v4..." }

// 200
{ "data": { "access_token": "eyJ..." } }

// 401 — token not found, revoked, or expired
{ "statusCode": 401, "message": "Invalid refresh token", "error": "Unauthorized" }
```

### POST /auth/logout
```json
// Header: Authorization: Bearer <access_token>
// Request body: { "refresh_token": "uuid-v4..." }

// Behaviour: revokes only the provided refresh token (single-device logout)
// Access token is NOT blacklisted — accepted risk given 15-minute TTL

// 200
{ "data": { "message": "Logged out successfully" } }
```

### GET /auth/me
```json
// Header: Authorization: Bearer <access_token>

// 200
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "phone": null,
    "role": "user",
    "is_verified": true,
    "created_at": "2026-03-21T00:00:00.000Z"
  }
}
```
Password hash is never returned.

---

## OTP Flows

### Registration via email
1. `POST /auth/register/email` → create user (`is_verified=false`) → generate 6-digit OTP → hash and store in `otp_codes` (type: `email_verify`) → send via SMTP → return 201
2. `POST /auth/verify/otp` (type: `email_verify`) → validate code hash, expiry, attempts → set `is_verified=true`, mark OTP used → issue access + refresh tokens → return 200

### Registration via phone
Same as email flow, delivery via SMS, type: `phone_verify`.

### Login via phone (passwordless)
1. `POST /auth/login/phone` → verify user exists and is verified → generate OTP → hash and store (type: `phone_login`) → send SMS → return 200
2. `POST /auth/verify/otp` (type: `phone_login`) → validate → issue tokens → return 200

### OTP attempt logic
- `attempts` counter increments on each failed attempt for the specific `otp_codes` record
- At `attempts >= 3`: mark code as used/invalid, return 429
- After invalidation, user must call `/auth/otp/resend` to get a new code (new counter)
- The 3-attempt limit cannot be bypassed by re-registering — unverified re-registration replaces the user record and creates a fresh OTP

---

## Response Format

All responses wrapped in a consistent envelope:

```json
// Success
{ "data": { ... }, "message": "success" }

// Error
{ "statusCode": 400, "message": "...", "error": "..." }
```

Global `ResponseInterceptor` wraps successful responses. Global `HttpExceptionFilter` formats errors.

---

## Security

- **bcrypt** rounds: 12 for passwords; OTP codes stored as bcrypt hash (rounds: 10)
- **Rate limiting** (`@nestjs/throttler`): 5 req/min per IP on `/auth/otp/*` and `/auth/login/*`
- **JWT secret** from env `JWT_SECRET`
- **Refresh token rotation:** disabled in v1 (stated decision, not omission)
- **Access token blacklist:** not implemented — accepted risk given 15-min TTL
- Users blocked from login until `is_verified = true`

---

## Roles

Two roles: `user` (default) and `admin`.

- `RolesGuard` + `@Roles()` decorator for role-based endpoint protection
- `JwtAuthGuard` validates access token on protected routes
- Admin endpoints (future phases) require `role = 'admin'`

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT
JWT_SECRET=<long-random-string>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL_DAYS=30

# SMTP (email OTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=<password>
SMTP_FROM="ByteAll <noreply@example.com>"

# Twilio (SMS OTP)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

# App
PORT=3000
NODE_ENV=development
```

---

## Testing

- **Unit tests** (`*.spec.ts`): `AuthService` — OTP generation/validation, token issuance, token refresh, logout, duplicate registration, attempt counter logic
- **E2E tests** (`test/*.e2e-spec.ts`): All 9 endpoints with happy paths and error cases, using a test database
- Test database: local PostgreSQL via Docker Compose

---

## Out of Scope (Phase 1)

- Admin panel
- OAuth (Google, GitHub)
- Password reset / forgot password flow
- User profile management (update email/phone)
- All-device logout
- Refresh token rotation
- Core business API
