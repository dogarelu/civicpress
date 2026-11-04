import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import { AppModule } from './app.module';
import { MAX_VIDEO_SIZE } from './modules/media/media.service';

async function bootstrap() {
  const adapter = new FastifyAdapter({ logger: false, bodyLimit: MAX_VIDEO_SIZE });

  adapter.register(fastifyCookie as any, {
    secret: process.env.COOKIE_SECRET || 'civicpress-cookie-secret',
  });

  adapter.register(fastifyMultipart as any, {
    limits: { fileSize: MAX_VIDEO_SIZE },
  });

  // Register helmet and cors on the underlying fastify instance before NestJS uses it
  adapter.register(fastifyHelmet as any, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
  });
  adapter.register(fastifyCors as any, {
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
