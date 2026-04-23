import { Injectable, NotFoundException } from '@nestjs/common';
import { InquiriesRepository } from './inquiries.repository';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { InquiryStatus } from '@prisma/client';

@Injectable()
export class InquiriesService {
  constructor(private repo: InquiriesRepository) {}

  create(dto: CreateInquiryDto) {
    return this.repo.create(dto);
  }

  async findAll(options: { skip: number; take: number; status?: InquiryStatus }) {
    const [data, total] = await Promise.all([
      this.repo.findAll(options),
      this.repo.count(options.status),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    const inquiry = await this.repo.findById(id);
    if (!inquiry) throw new NotFoundException('Inquiry not found');
    return inquiry;
  }

  async updateStatus(id: string, status: InquiryStatus, notes?: string) {
    await this.findById(id);
    return this.repo.updateStatus(id, status, notes);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.repo.delete(id);
  }

  async getStats() {
    const [total, newCount, read, replied, closed] = await this.repo.getStats();
    return { total, new: newCount, read, replied, closed };
  }
}
