import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationStatus } from '@prisma/client';

const APPLICATION_INCLUDE = {
  vacancy: { select: { id: true, title: true, slug: true, department: true } },
};

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllAdmin(
    start: number,
    take: number,
    status?: ApplicationStatus,
    vacancyId?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (vacancyId) where.vacancyId = vacancyId;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where,
        skip: start,
        take,
        orderBy: { createdAt: 'desc' },
        include: APPLICATION_INCLUDE,
      }),
      this.prisma.application.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    return this.prisma.application.findUnique({
      where: { id },
      include: APPLICATION_INCLUDE,
    });
  }

  async create(data: {
    vacancyId?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    coverLetter?: string;
    resumeUrl?: string;
  }) {
    return this.prisma.application.create({
      data: { id: randomUUID(), ...data },
      include: APPLICATION_INCLUDE,
    });
  }

  async updateStatus(id: string, status: ApplicationStatus, notes?: string) {
    return this.prisma.application.update({
      where: { id },
      data: { status, ...(notes !== undefined && { notes }) },
      include: APPLICATION_INCLUDE,
    });
  }

  async delete(id: string) {
    return this.prisma.application.delete({ where: { id } });
  }

  async getStats() {
    const [total, newCount, reviewing, interview, offered, rejected, hired] =
      await this.prisma.$transaction([
        this.prisma.application.count(),
        this.prisma.application.count({ where: { status: ApplicationStatus.new } }),
        this.prisma.application.count({ where: { status: ApplicationStatus.reviewing } }),
        this.prisma.application.count({ where: { status: ApplicationStatus.interview } }),
        this.prisma.application.count({ where: { status: ApplicationStatus.offered } }),
        this.prisma.application.count({ where: { status: ApplicationStatus.rejected } }),
        this.prisma.application.count({ where: { status: ApplicationStatus.hired } }),
      ]);
    return { total, new: newCount, reviewing, interview, offered, rejected, hired };
  }
}
