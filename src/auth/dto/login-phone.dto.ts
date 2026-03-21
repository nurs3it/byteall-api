import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class LoginPhoneDto {
  @ApiProperty({ example: '+77001234567' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Phone must be in E.164 format' })
  phone: string;
}
