import { Module } from '@nestjs/common';
import { VacanciesAdminController } from './vacancies.admin.controller';
import { VacanciesController } from './vacancies.controller';
import { VacanciesService } from './vacancies.service';
import { VacanciesRepository } from './vacancies.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  // Admin controller FIRST — so /vacancies/admin is matched before /vacancies/:slug
  controllers: [VacanciesAdminController, VacanciesController],
  providers: [VacanciesService, VacanciesRepository, RolesGuard],
  exports: [VacanciesService],
})
export class VacanciesModule {}
