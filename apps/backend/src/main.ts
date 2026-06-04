import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import * as fastifyCookie from '@fastify/cookie';
import * as fastifyMultipart from '@fastify/multipart';
import * as fastifyHelmet from '@fastify/helmet';
import * as fastifyCors from '@fastify/cors';
import { AppModule } from './app.module';

async function bootstrap() {
  const adapter = new FastifyAdapter({ logger: false });

  adapter.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'civicpress-cookie-secret',
  });

  adapter.register(fastifyMultipart, {
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  // Register helmet and cors on the underlying fastify instance before NestJS uses it
  adapter.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  });
  adapter.register(fastifyCors, {
    origin: [
      'http://localhost:4200',
      'http://localhost:4300',
      process.env.PUBLIC_URL ?? '',
      process.env.ADMIN_URL ?? '',
    ].filter(Boolean),
    credentials: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`Backend listening on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
