import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaClient } from '@prisma/client';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const prisma = new PrismaClient();
  await prisma.$connect();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
    }),
  );

  app.use(cookieParser());

  app.enableCors({
    credentials: true,
    // origin: ['http://localhost:3003'],
    origin: [
      `http://${process.env.APP_HOSTNAME_URL}:${process.env.FRONTEND_PORT}`,
    ],
    // origin: '*',
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['POST', 'GET', 'PUT', 'PATCH'],
  });

  await app.listen(3000);

  process.on('SIGINT', async () => {
    try {
      await prisma.$disconnect();
    } catch (e) {
      console.error('Error disconnecting Prisma:', e);
    }
    process.exit();
  });
}
bootstrap();
