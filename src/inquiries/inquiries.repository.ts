import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { InquiryStatus } from '@prisma/client';

@Injectable()
export class InquiriesRepository {
  constructor(private prisma: PrismaService) {}

  create(data: CreateInquiryDto) {
    return this.prisma.inquiry.create({ data });
  }

  findAll(options: {
    skip: number;
    take: number;
    status?: InquiryStatus;
  }) {
    const where = options.status ? { status: options.status } : {};
    return this.prisma.inquiry.findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count(status?: InquiryStatus) {
    const where = status ? { status } : {};
    return this.prisma.inquiry.count({ where });
  }

  findById(id: string) {
    return this.prisma.inquiry.findUnique({ where: { id } });
  }

  updateStatus(id: string, status: InquiryStatus, notes?: string) {
    return this.prisma.inquiry.update({
      where: { id },
      data: { status, ...(notes !== undefined && { notes }) },
    });
  }

  delete(id: string) {
    return this.prisma.inquiry.delete({ where: { id } });
  }

  getStats() {
    return this.prisma.$transaction([
      this.prisma.inquiry.count(),
      this.prisma.inquiry.count({ where: { status: 'new' } }),
      this.prisma.inquiry.count({ where: { status: 'read' } }),
      this.prisma.inquiry.count({ where: { status: 'replied' } }),
      this.prisma.inquiry.count({ where: { status: 'closed' } }),
    ]);
  }
}
