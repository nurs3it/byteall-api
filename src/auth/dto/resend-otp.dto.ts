import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  identifier: string;

  @ApiProperty({ enum: ['email_verify', 'phone_verify', 'phone_login'] })
  @IsIn(['email_verify', 'phone_verify', 'phone_login'])
  type: string;
}
