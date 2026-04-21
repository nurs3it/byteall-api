import { Module } from '@nestjs/common';
import { AdminModule as AdminJSModule } from '@adminjs/nestjs';
import AdminJS from 'adminjs';
import { PrismaClient } from '@prisma/client';
import { Database, Resource, getModelByName } from '@adminjs/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { authenticate } from './admin.auth';
import { canPerformAction } from './admin.permissions';

AdminJS.registerAdapter({ Database, Resource });

@Module({
  imports: [
    AdminJSModule.createAdminAsync({
      useFactory: async (prisma: PrismaService) => {
        const sessionSecret = process.env.SESSION_SECRET;
        if (!sessionSecret) {
          throw new Error('SESSION_SECRET environment variable is not set');
        }

        return {
          adminJsOptions: {
            rootPath: '/admin',
            resources: [
              {
                resource: {
                  model: getModelByName('User'),
                  client: prisma as unknown as PrismaClient,
                },
                options: {
                  navigation: { name: 'User Management' },
                  properties: {
                    password: { isVisible: false },
                    id: { isEditable: false },
                    email: { isEditable: false },
                    createdAt: { isEditable: false },
                    updatedAt: { isEditable: false },
                  },
                  actions: {
                    new: { isAccessible: false },
                    list: { isAccessible: canPerformAction },
                    show: { isAccessible: canPerformAction },
                    edit: { isAccessible: canPerformAction },
                    delete: { isAccessible: canPerformAction },
                  },
                },
              },
              {
                resource: {
                  model: getModelByName('RefreshToken'),
                  client: prisma as unknown as PrismaClient,
                },
                options: {
                  navigation: { name: 'Auth' },
                  properties: {
                    token: { isVisible: false },
                  },
                  actions: {
                    new: { isAccessible: false },
                    edit: { isAccessible: false },
                    list: { isAccessible: canPerformAction },
                    show: { isAccessible: canPerformAction },
                    delete: { isAccessible: canPerformAction },
                  },
                },
              },
            ],
          },
          auth: {
            authenticate: (email: string, password: string) =>
              authenticate(email, password, prisma),
            cookieName: 'adminjs',
            cookiePassword: sessionSecret,
          },
          sessionOptions: {
            resave: false,
            saveUninitialized: false,
            secret: sessionSecret,
          },
        };
      },
      inject: [PrismaService],
      imports: [PrismaModule],
    }),
  ],
})
export class AdminModule {}
