import { Test } from '@nestjs/testing';
import { UsersRepository } from './users.repository';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('UsersRepository', () => {
  let repo: UsersRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    repo = module.get(UsersRepository);
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      const user = { id: '1', email: 'a@b.com' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      const result = await repo.findByEmail('a@b.com');
      expect(result).toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
      });
    });

    it('returns null when not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const result = await repo.findByEmail('unknown@b.com');
      expect(result).toBeNull();
    });
  });

  describe('findByPhone', () => {
    it('returns user when found', async () => {
      const user = { id: '1', phone: '+7700' };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      const result = await repo.findByPhone('+7700');
      expect(result).toEqual(user);
    });
  });
});
