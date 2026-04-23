import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { TagsModule } from './tags/tags.module';
import { UploadsModule } from './uploads/uploads.module';
import { PostsModule } from './posts/posts.module';
import { VacanciesModule } from './vacancies/vacancies.module';
import { ApplicationsModule } from './applications/applications.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { LinkedInModule } from './linkedin/linkedin.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 5 }],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    TagsModule,
    UploadsModule,
    PostsModule,
    VacanciesModule,
    ApplicationsModule,
    InquiriesModule,
    LinkedInModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
