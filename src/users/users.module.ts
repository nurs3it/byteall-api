import { Module } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RolesGuard } from '../auth/guards/roles.guard';

@Module({
  controllers: [UsersController],
  providers: [UsersRepository, UsersService, RolesGuard],
  exports: [UsersService],
})
export class UsersModule {}
