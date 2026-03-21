import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, Matches, MaxLength } from 'class-validator';

export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @MaxLength(254)
  identifier: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be 6 digits' })
  code: string;

  @ApiProperty({ enum: ['email_verify', 'phone_verify', 'phone_login'] })
  @IsIn(['email_verify', 'phone_verify', 'phone_login'])
  type: string;
}
