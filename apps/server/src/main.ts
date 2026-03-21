import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGINS', 'http://localhost:8081').split(','),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const prefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(prefix, { exclude: ['health'] });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();
