import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, Matches } from 'class-validator';

export class RegisterPhoneDto {
  @ApiProperty({ example: '+77001234567' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, { message: 'Phone must be in E.164 format' })
  phone: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and a number',
  })
  password: string;
}
