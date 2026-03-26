import {
  Injectable,
  UnsupportedMediaTypeException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class UploadsService {
  private supabase;

  constructor(private readonly config: ConfigService) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_KEY'),
    );
  }

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
    folder: 'covers' | 'content',
  ): Promise<{ url: string }> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Unsupported file type');
    }
    if (file.size > MAX_SIZE_BYTES) {
      throw new PayloadTooLargeException('File exceeds 5 MB limit');
    }

    const ext = file.originalname.split('.').pop();
    const path = `${folder}/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await this.supabase.storage
      .from('post-images')
      .upload(path, file.buffer, { contentType: file.mimetype });

    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    const { data } = this.supabase.storage.from('post-images').getPublicUrl(path);
    return { url: data.publicUrl };
  }
}
