import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

export interface AdminSessionUser {
  id: string;
  email: string;
  role: string;
  isVerified: boolean;
}

export async function authenticate(
  email: string,
  password: string,
  prisma: PrismaService,
): Promise<AdminSessionUser | null> {
  if (!email || !password) return null;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.email) return null;

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
  };
}
