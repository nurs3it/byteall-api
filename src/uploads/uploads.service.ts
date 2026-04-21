import {
  Injectable,
  BadRequestException,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class UploadsService {
  private supabase: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_KEY');
    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
    folder: 'covers' | 'content',
  ): Promise<{ url: string }> {
    if (!this.supabase) {
      throw new InternalServerErrorException('Storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_KEY missing)');
    }
    if (!['covers', 'content'].includes(folder)) {
      throw new BadRequestException('Invalid folder');
    }
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Unsupported file type');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new PayloadTooLargeException('File exceeds 10 MB limit');
    }

    const ext = file.originalname.split('.').pop();
    const path = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await this.supabase.storage
      .from('post-images')
      .upload(path, file.buffer, { contentType: file.mimetype });

    if (error) throw new InternalServerErrorException(`Storage upload failed: ${error.message}`);

    const { data } = this.supabase.storage.from('post-images').getPublicUrl(path);
    return { url: data.publicUrl };
  }

  async uploadImageByUrl(
    imageUrl: string,
    userId: string,
    folder: 'covers' | 'content',
  ): Promise<{ url: string }> {
    if (!this.supabase) {
      throw new InternalServerErrorException('Storage is not configured');
    }

    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await fetch(imageUrl);
    } catch {
      throw new BadRequestException('Cannot fetch image from URL');
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    if (!ALLOWED_MIME_TYPES.some((m) => contentType.startsWith(m.split('/')[0]))) {
      throw new UnsupportedMediaTypeException('URL does not point to a valid image');
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_SIZE_BYTES) {
      throw new PayloadTooLargeException('Remote image exceeds 10 MB limit');
    }

    const ext = imageUrl.split('?')[0].split('.').pop()?.split('/').pop() ?? 'jpg';
    const path = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await this.supabase.storage
      .from('post-images')
      .upload(path, buffer, { contentType });

    if (error) throw new InternalServerErrorException(`Storage upload failed: ${error.message}`);

    const { data } = this.supabase.storage.from('post-images').getPublicUrl(path);
    return { url: data.publicUrl };
  }
}
