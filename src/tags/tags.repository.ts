import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.tag.findUnique({ where: { id } });
  }

  findBySlug(slug: string) {
    return this.prisma.tag.findUnique({ where: { slug } });
  }

  findByIds(ids: string[]) {
    return this.prisma.tag.findMany({ where: { id: { in: ids } } });
  }

  create(name: string, slug: string) {
    return this.prisma.tag.create({ data: { id: randomUUID(), name, slug } });
  }

  delete(id: string) {
    return this.prisma.tag.delete({ where: { id } });
  }
}
