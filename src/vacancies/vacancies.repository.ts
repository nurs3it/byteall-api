import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { VacancyStatus } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class VacanciesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPublished() {
    return this.prisma.vacancy.findMany({
      where: { status: VacancyStatus.published },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async findBySlugPublished(slug: string) {
    return this.prisma.vacancy.findFirst({
      where: { slug, status: VacancyStatus.published },
    });
  }

  async findAllAdmin(start: number, take: number, status?: VacancyStatus, department?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (department) where.department = department;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.vacancy.findMany({
        where,
        skip: start,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { applications: true } } },
      }),
      this.prisma.vacancy.count({ where }),
    ]);
    return { data, total };
  }

  async findById(id: string) {
    return this.prisma.vacancy.findUnique({
      where: { id },
      include: { _count: { select: { applications: true } } },
    });
  }

  async create(data: {
    title: string;
    slug: string;
    department: string;
    location: string;
    type?: string;
    description: string;
    about?: string;
    responsibilities?: string[];
    requirements: string[];
    niceToHave?: string[];
    status?: VacancyStatus;
    isNew?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.vacancy.create({
      data: {
        id: randomUUID(),
        ...data,
        publishedAt: data.status === VacancyStatus.published ? new Date() : null,
      },
    });
  }

  async update(id: string, data: {
    title?: string;
    department?: string;
    location?: string;
    type?: string;
    description?: string;
    about?: string;
    responsibilities?: string[];
    requirements?: string[];
    niceToHave?: string[];
    status?: VacancyStatus;
    isNew?: boolean;
    sortOrder?: number;
  }) {
    const current = await this.prisma.vacancy.findUnique({
      where: { id },
      select: { status: true },
    });

    const publishedAt =
      data.status === VacancyStatus.published && current?.status !== VacancyStatus.published
        ? new Date()
        : undefined;

    return this.prisma.vacancy.update({
      where: { id },
      data: { ...data, ...(publishedAt !== undefined && { publishedAt }) },
    });
  }

  async delete(id: string) {
    return this.prisma.vacancy.delete({ where: { id } });
  }

  async generateSlug(title: string): Promise<string> {
    const base = slugify(title, { lower: true, strict: true });
    const exists = await this.prisma.vacancy.findUnique({
      where: { slug: base },
      select: { id: true },
    });
    if (!exists) return base;
    let i = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = `${base}-${i}`;
      const taken = await this.prisma.vacancy.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!taken) return candidate;
      i++;
    }
  }

  async getStats() {
    const [total, published, draft, closed] = await this.prisma.$transaction([
      this.prisma.vacancy.count(),
      this.prisma.vacancy.count({ where: { status: VacancyStatus.published } }),
      this.prisma.vacancy.count({ where: { status: VacancyStatus.draft } }),
      this.prisma.vacancy.count({ where: { status: VacancyStatus.closed } }),
    ]);
    return { total, published, draft, closed };
  }

  async getDepartments() {
    const results = await this.prisma.vacancy.findMany({
      where: { status: VacancyStatus.published },
      select: { department: true },
      distinct: ['department'],
      orderBy: { department: 'asc' },
    });
    return results.map((r) => r.department);
  }
}
