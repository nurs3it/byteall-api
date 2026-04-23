import {
  IsArray, IsBoolean, IsEnum, IsInt, IsNotEmpty,
  IsOptional, IsString, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VacancyStatus } from '@prisma/client';

export class CreateVacancyDto {
  @ApiProperty({ example: 'Full-Stack Developer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'Software' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  department: string;

  @ApiProperty({ example: 'Astana, Kazakhstan / Remote' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  location: string;

  @ApiPropertyOptional({ example: 'Full-time' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  type?: string;

  @ApiProperty({ example: 'Short description of the role' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 'Detailed about section' })
  @IsOptional()
  @IsString()
  about?: string;

  @ApiPropertyOptional({ example: ['Design APIs', 'Write tests'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  responsibilities?: string[];

  @ApiProperty({ example: ['3+ years React', 'TypeScript'] })
  @IsArray()
  @IsString({ each: true })
  requirements: string[];

  @ApiPropertyOptional({ example: ['Docker experience'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  niceToHave?: string[];

  @ApiPropertyOptional({ enum: VacancyStatus, default: VacancyStatus.draft })
  @IsOptional()
  @IsEnum(VacancyStatus)
  status?: VacancyStatus;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isNew?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}
