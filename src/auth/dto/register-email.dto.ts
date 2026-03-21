import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, Matches } from 'class-validator';

export class RegisterEmailDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and a number',
  })
  password: string;
}
