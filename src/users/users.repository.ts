import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, UserRole } from '@prisma/client';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  create(data: {
    email?: string;
    phone?: string;
    password: string;
    role?: UserRole;
  }): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: Partial<User>): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  delete(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  async findAllAdmin(skip: number, take: number) {
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);
    return { data, total };
  }

  async findByIdAdmin(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateRole(id: string, role: UserRole) {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAllOtpCodes(skip: number, take: number) {
    const [data, total] = await Promise.all([
      this.prisma.otpCode.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, phone: true } } },
      }),
      this.prisma.otpCode.count(),
    ]);
    return { data, total };
  }

  async findAllRefreshTokens(skip: number, take: number) {
    const [data, total] = await Promise.all([
      this.prisma.refreshToken.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, phone: true } } },
      }),
      this.prisma.refreshToken.count(),
    ]);
    return { data, total };
  }

  async getStats() {
    const [totalUsers, verifiedUsers, activeTokens, otpToday] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isVerified: true } }),
      this.prisma.refreshToken.count({
        where: { revoked: false, expiresAt: { gt: new Date() } },
      }),
      this.prisma.otpCode.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);
    return { totalUsers, verifiedUsers, activeTokens, otpToday };
  }
}
