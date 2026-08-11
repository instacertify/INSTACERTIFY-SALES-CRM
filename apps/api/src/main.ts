import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const corsOrigin = config.get<string>(
    'CORS_ORIGIN',
    'http://localhost:3000',
  );
  const origins = corsOrigin
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins.length ? origins : true,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // On Hostinger, Nest runs on an internal API_PORT; public PORT is Next.
  const port = Number(
    config.get<string>('API_PORT') ||
      config.get<string>('PORT_API') ||
      config.get<string>('PORT') ||
      '4000',
  );
  const host = config.get<string>('HOST', '0.0.0.0');
  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(`Instacertify API listening on http://${host}:${port}/api/v1`);
}

bootstrap();
