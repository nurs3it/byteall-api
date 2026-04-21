import {
  Controller, Post, UseGuards, UseInterceptors,
  UploadedFile, Query, ParseFilePipe, Body,
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

  /** Стандартная загрузка обложки (поле file) */
  @Post('image')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload image — returns { url }' })
  uploadImage(
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true })) file: Express.Multer.File,
    @CurrentUser() user: User,
    @Query('folder') folder: 'covers' | 'content' = 'content',
  ) {
    return this.uploadsService.uploadImage(file, user.id, folder);
  }

  /** Editor.js Image Tool — byFile (поле image) — returns { success, file: { url } } */
  @Post('editorjs')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { image: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Editor.js image upload by file' })
  async uploadEditorJs(
    @UploadedFile(new ParseFilePipe({ fileIsRequired: true })) file: Express.Multer.File,
    @CurrentUser() user: User,
    @Query('folder') folder: 'covers' | 'content' = 'content',
  ) {
    const result = await this.uploadsService.uploadImage(file, user.id, folder);
    return { success: 1, file: { url: result.url } };
  }

  /** Editor.js Image Tool — byUrl — returns { success, file: { url } } */
  @Post('editorjs-url')
  @ApiOperation({ summary: 'Editor.js image upload by URL' })
  async uploadEditorJsByUrl(
    @Body('url') imageUrl: string,
    @CurrentUser() user: User,
    @Query('folder') folder: 'covers' | 'content' = 'content',
  ) {
    if (!imageUrl) return { success: 0, message: 'URL is required' };
    const result = await this.uploadsService.uploadImageByUrl(imageUrl, user.id, folder);
    return { success: 1, file: { url: result.url } };
  }
}
