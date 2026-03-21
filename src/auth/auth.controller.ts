import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { RegisterEmailDto } from './dto/register-email.dto';
import { RegisterPhoneDto } from './dto/register-phone.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginEmailDto } from './dto/login-email.dto';
import { LoginPhoneDto } from './dto/login-phone.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LogoutDto } from './dto/logout.dto';
import { OtpType } from '@prisma/client';
import type { User } from '@prisma/client';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/email')
  @ApiOperation({ summary: 'Register with email + password' })
  @ApiResponse({ status: 201, description: 'OTP sent to email' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async registerEmail(@Body() dto: RegisterEmailDto) {
    await this.authService.registerEmail(dto.email, dto.password);
    return { message: 'OTP sent to email' };
  }

  @Post('register/phone')
  @ApiOperation({ summary: 'Register with phone + password' })
  @ApiResponse({ status: 201, description: 'OTP sent to phone' })
  @ApiResponse({ status: 409, description: 'Phone already in use' })
  async registerPhone(@Body() dto: RegisterPhoneDto) {
    await this.authService.registerPhone(dto.phone, dto.password);
    return { message: 'OTP sent to phone' };
  }

  @Post('verify/otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP code' })
  @ApiResponse({ status: 200, description: 'Tokens issued' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 429, description: 'Too many attempts' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.identifier, dto.code, dto.type as OtpType);
  }

  @Post('login/email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Login with email + password' })
  @ApiResponse({ status: 200, description: 'Tokens issued' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Email not verified' })
  async loginEmail(@Body() dto: LoginEmailDto) {
    return this.authService.loginEmail(dto.email, dto.password);
  }

  @Post('login/phone')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Login with phone — sends OTP' })
  @ApiResponse({ status: 200, description: 'OTP sent to phone' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async loginPhone(@Body() dto: LoginPhoneDto) {
    await this.authService.loginPhone(dto.phone);
    return { message: 'OTP sent to phone' };
  }

  @Post('otp/resend')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Resend OTP code' })
  @ApiResponse({ status: 200, description: 'OTP resent' })
  @ApiResponse({ status: 429, description: 'Cooldown active' })
  async resendOtp(@Body() dto: ResendOtpDto) {
    await this.authService.resendOtp(dto.identifier, dto.type as OtpType);
    return { message: 'OTP resent' };
  }

  @Post('token/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'New access token' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refresh_token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout (revoke refresh token)' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  async logout(@CurrentUser() user: User, @Body() dto: LogoutDto) {
    await this.authService.logout(user.id, dto.refresh_token);
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  async me(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email ?? null,
      phone: user.phone ?? null,
      role: user.role,
      is_verified: user.isVerified,
      created_at: user.createdAt,
    };
  }
}
