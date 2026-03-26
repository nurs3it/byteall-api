import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: string) {
    return this.prisma.category.findUnique({ where: { id } });
  }

  create(name: string, slug: string) {
    return this.prisma.category.create({ data: { id: randomUUID(), name, slug } });
  }

  delete(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}
