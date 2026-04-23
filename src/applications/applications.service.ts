import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ApplicationsRepository } from './applications.repository';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ApplicationStatus } from '@prisma/client';

const ALLOWED_RESUME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_RESUME_SIZE = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class ApplicationsService {
  private supabase: SupabaseClient | null = null;

  constructor(
    private readonly repo: ApplicationsRepository,
    private readonly config: ConfigService,
  ) {
    const url = this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_KEY');
    if (url && key) {
      this.supabase = createClient(url, key);
    }
  }

  async submitApplication(dto: CreateApplicationDto, file?: Express.Multer.File) {
    let resumeUrl: string | undefined;

    if (file) {
      resumeUrl = await this.uploadResume(file);
    }

    return this.repo.create({ ...dto, resumeUrl });
  }

  findAllAdmin(start: number, take: number, status?: ApplicationStatus, vacancyId?: string) {
    return this.repo.findAllAdmin(start, take, status, vacancyId);
  }

  async findByIdAdmin(id: string) {
    const app = await this.repo.findById(id);
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async updateStatus(id: string, dto: UpdateApplicationStatusDto) {
    const app = await this.repo.findById(id);
    if (!app) throw new NotFoundException('Application not found');
    return this.repo.updateStatus(id, dto.status, dto.notes);
  }

  async delete(id: string) {
    const app = await this.repo.findById(id);
    if (!app) throw new NotFoundException('Application not found');
    return this.repo.delete(id);
  }

  getStats() {
    return this.repo.getStats();
  }

  private async uploadResume(file: Express.Multer.File): Promise<string> {
    if (!this.supabase) {
      throw new InternalServerErrorException('Storage is not configured');
    }
    if (!ALLOWED_RESUME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException('Only PDF and Word documents are allowed');
    }
    if (file.size > MAX_RESUME_SIZE) {
      throw new PayloadTooLargeException('Resume exceeds 10 MB limit');
    }

    const ext = file.originalname.split('.').pop() ?? 'pdf';
    const path = `resumes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await this.supabase.storage
      .from('applications')
      .upload(path, file.buffer, { contentType: file.mimetype });

    if (error) {
      throw new InternalServerErrorException(`Resume upload failed: ${error.message}`);
    }

    const { data } = this.supabase.storage.from('applications').getPublicUrl(path);
    return data.publicUrl;
  }
}
