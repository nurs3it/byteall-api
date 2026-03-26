import {
  Controller, Post, UseGuards, UseInterceptors,
  UploadedFile, Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiBearerAuth,
  ApiConsumes, ApiBody,
} from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { User } from '@prisma/client';

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiOperation({ summary: 'Upload image to Supabase Storage' })
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
    @Query('folder') folder: 'covers' | 'content' = 'content',
  ) {
    return this.uploadsService.uploadImage(file, user.id, folder);
  }
}
