import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.enableCors({ origin: '*' });

  // health
  const server = app.getHttpAdapter().getInstance();
  server.get('/health', (_req, res) => res.status(200).send('ok'));

  await app.listen(process.env.PORT || 4000);
  console.log('Realtime service listening on', process.env.PORT || 4000);
}
bootstrap();
