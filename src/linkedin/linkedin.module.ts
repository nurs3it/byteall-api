import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LinkedInService } from './linkedin.service';
import { LinkedInController } from './linkedin.controller';

@Module({
  imports: [PrismaModule],
  controllers: [LinkedInController],
  providers: [LinkedInService],
  exports: [LinkedInService],
})
export class LinkedInModule {}
