import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TagsRepository } from './tags.repository';
import { CreateTagDto } from './dto/create-tag.dto';
import slugify from 'slugify';

@Injectable()
export class TagsService {
  constructor(private readonly repo: TagsRepository) {}

  findAll() {
    return this.repo.findAll();
  }

  findByIds(ids: string[]) {
    return this.repo.findByIds(ids);
  }

  async create(dto: CreateTagDto) {
    const slug = slugify(dto.name, { lower: true, strict: true });
    const existing = await this.repo.findBySlug(slug);
    if (existing) {
      throw new ConflictException('Tag with this name already exists');
    }
    return this.repo.create(dto.name, slug);
  }

  async delete(id: string) {
    const tag = await this.repo.findById(id);
    if (!tag) throw new NotFoundException('Tag not found');
    return this.repo.delete(id);
  }
}
