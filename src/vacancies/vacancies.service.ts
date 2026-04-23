import { Injectable, NotFoundException } from '@nestjs/common';
import { VacanciesRepository } from './vacancies.repository';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { VacancyStatus } from '@prisma/client';

@Injectable()
export class VacanciesService {
  constructor(private readonly repo: VacanciesRepository) {}

  findAllPublished() {
    return this.repo.findAllPublished();
  }

  async findBySlugPublished(slug: string) {
    const vacancy = await this.repo.findBySlugPublished(slug);
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    return vacancy;
  }

  getDepartments() {
    return this.repo.getDepartments();
  }

  findAllAdmin(start: number, take: number, status?: VacancyStatus, department?: string) {
    return this.repo.findAllAdmin(start, take, status, department);
  }

  async findByIdAdmin(id: string) {
    const vacancy = await this.repo.findById(id);
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    return vacancy;
  }

  async create(dto: CreateVacancyDto) {
    const slug = await this.repo.generateSlug(dto.title);
    return this.repo.create({ ...dto, slug });
  }

  async update(id: string, dto: UpdateVacancyDto) {
    const vacancy = await this.repo.findById(id);
    if (!vacancy) throw new NotFoundException('Vacancy not found');

    if (dto.title && dto.title !== vacancy.title) {
      const slug = await this.repo.generateSlug(dto.title);
      return this.repo.update(id, { ...dto, ...({ slug } as any) });
    }
    return this.repo.update(id, dto);
  }

  async delete(id: string) {
    const vacancy = await this.repo.findById(id);
    if (!vacancy) throw new NotFoundException('Vacancy not found');
    return this.repo.delete(id);
  }

  getStats() {
    return this.repo.getStats();
  }
}
