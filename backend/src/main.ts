import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import fastifyCookie from '@fastify/cookie';
import multipart from '@fastify/multipart';

async function bootstrap() {
  // Initialize with Fastify Adapter
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Register Cookie Plugin
  await app.register(fastifyCookie, {
    secret: process.env.JWT_SECRET, // Used to sign cookies
  });

  // Enable CORS (Important for your Dashboard/Frontend)
  app.enableCors({
    origin: [
      'https://shop.yourdomain.com',
      'http://localhost:4321',
      'http://localhost:5173',
    ],
    credentials: true, // Allow cookies
  });

  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  });

  // Global Validation Pipe (Protects all endpoints)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties not in the DTO
      forbidNonWhitelisted: true, // Throw error if extra properties sent
      transform: true, // Auto-convert types (e.g. string "1" to number 1)
    }),
  );

  // Set global prefix (e.g., api.yourdomain.com/v1/...)
  app.setGlobalPrefix('v1');

  // cPanel/Passenger Logic
  // Passenger automatically sets the PORT env variable.
  // We bind to 0.0.0.0 to ensure external access via the proxy.
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Application is running on: ${await app.getUrl()}`);
}
bootstrap();
