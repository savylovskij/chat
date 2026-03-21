import 'dotenv/config';

import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';
import { setupSwagger } from './config/swagger.config';

validateEnv();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());

  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:8081').split(','),
    credentials: true,
  });

  const prefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(prefix, { exclude: ['health'] });

  setupSwagger(app);

  const port = parseInt(process.env.PORT ?? '3000', 10);
  await app.listen(port);
}

void bootstrap();
