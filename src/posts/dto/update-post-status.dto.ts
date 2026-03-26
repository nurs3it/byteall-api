import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PostStatus } from '@prisma/client';

export class UpdatePostStatusDto {
  @ApiProperty({ enum: PostStatus })
  @IsEnum(PostStatus)
  status: PostStatus;
}
