import {
  IsArray, IsEnum, IsNotEmpty, IsOptional,
  IsString, IsUrl, IsUUID, MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';

export class CreatePostDto {
  @ApiProperty({ example: 'My first article' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: '<p>Content here</p>' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'https://storage.supabase.co/...' })
  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @ApiPropertyOptional({ example: 'uuid-of-category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: ['uuid1', 'uuid2'] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({ enum: PostStatus, default: PostStatus.draft })
  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
