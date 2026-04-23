import { IsString, IsEmail, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  subject: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;
}
