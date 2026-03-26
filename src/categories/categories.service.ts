import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import slugify from 'slugify';

@Injectable()
export class CategoriesService {
  constructor(private readonly repo: CategoriesRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const existing = await this.repo.findAll();
    if (existing.some((c) => c.slug === slug)) {
      throw new ConflictException('Category with this name already exists');
    }
    return this.repo.create(dto.name, slug);
  }

  async delete(id: string) {
    const category = await this.repo.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    return this.repo.delete(id);
  }
}
