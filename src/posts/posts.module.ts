import { Module } from '@nestjs/common';
import { PostsAdminController } from './posts.admin.controller';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PostsRepository } from './posts.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  imports: [PrismaModule],
  // PostsAdminController FIRST — so /posts/admin is matched before /posts/:slug
  controllers: [PostsAdminController, PostsController],
  providers: [PostsService, PostsRepository, RolesGuard],
})
export class PostsModule {}
