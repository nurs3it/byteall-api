import { Module } from '@nestjs/common';
import { ApplicationsAdminController } from './applications.admin.controller';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { ApplicationsRepository } from './applications.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  // Admin controller FIRST — so /applications/admin is matched before other routes
  controllers: [ApplicationsAdminController, ApplicationsController],
  providers: [ApplicationsService, ApplicationsRepository, RolesGuard],
})
export class ApplicationsModule {}
