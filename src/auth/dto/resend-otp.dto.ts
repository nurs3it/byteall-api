import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, MaxLength } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @MaxLength(254)
  identifier: string;

  @ApiProperty({ enum: ['email_verify', 'phone_verify', 'phone_login'] })
  @IsIn(['email_verify', 'phone_verify', 'phone_login'])
  type: string;
}
