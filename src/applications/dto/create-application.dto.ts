import {
  IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiPropertyOptional({ example: 'uuid-of-vacancy' })
  @IsOptional()
  @IsUUID()
  vacancyId?: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+7 777 123 4567' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @ApiPropertyOptional({ example: 'I am interested in this role because...' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  coverLetter?: string;
}
