import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InquiriesAdminController } from './inquiries.admin.controller';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';
import { InquiriesRepository } from './inquiries.repository';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  controllers: [InquiriesAdminController, InquiriesController],
  providers: [InquiriesService, InquiriesRepository, RolesGuard],
})
export class InquiriesModule {}
