import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findById(id);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findByPhone(phone);
  }

  create(data: { email?: string; phone?: string; password: string; role?: UserRole }): Promise<User> {
    return this.usersRepository.create(data);
  }

  update(id: string, data: Partial<User>): Promise<User> {
    return this.usersRepository.update(id, data);
  }

  delete(id: string): Promise<User> {
    return this.usersRepository.delete(id);
  }

  findAllAdmin(skip: number, take: number) {
    return this.usersRepository.findAllAdmin(skip, take);
  }

  findByIdAdmin(id: string) {
    return this.usersRepository.findByIdAdmin(id);
  }

  updateRole(id: string, role: UserRole) {
    return this.usersRepository.updateRole(id, role);
  }

  findAllOtpCodes(skip: number, take: number) {
    return this.usersRepository.findAllOtpCodes(skip, take);
  }

  findAllRefreshTokens(skip: number, take: number) {
    return this.usersRepository.findAllRefreshTokens(skip, take);
  }

  getStats() {
    return this.usersRepository.getStats();
  }
}
