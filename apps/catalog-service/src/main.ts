import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  app.enableCors();

  const server = app.getHttpAdapter().getInstance();
  server.get('/health', (_req, res) => res.status(200).send('ok'));

  const port = process.env.PORT || 3003;
  await app.listen(port);
  console.log('Catalog service listening on', port);
}
bootstrap();
