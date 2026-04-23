import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { VacanciesService } from './vacancies.service';

@ApiTags('Vacancies')
@Controller('vacancies')
@SkipThrottle()
export class VacanciesController {
  constructor(private readonly vacanciesService: VacanciesService) {}

  @Get()
  @ApiOperation({ summary: 'List all published vacancies' })
  findAll() {
    return this.vacanciesService.findAllPublished();
  }

  @Get('departments')
  @ApiOperation({ summary: 'List distinct departments with published vacancies' })
  getDepartments() {
    return this.vacanciesService.getDepartments();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a published vacancy by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.vacanciesService.findBySlugPublished(slug);
  }
}
