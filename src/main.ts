import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      process.env.ADMIN_ORIGIN ?? 'http://localhost:3001',
      process.env.FRONTEND_ORIGIN ?? 'http://localhost:3002',
    ],
    credentials: true,
    exposedHeaders: ['X-Total-Count'],
  });

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('ByteAll API')
      .setDescription('ByteAll backend API documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Enable graceful shutdown hooks (required for PrismaService.onModuleDestroy)
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
  const url = await app.getUrl();
  console.log(`Application running on: ${url}`);
  console.log(`Swagger docs: ${url}/api/docs`);
}
bootstrap();
