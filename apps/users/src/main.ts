import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { UsersModule } from '../../src/users/users.module';
import { MongooseModule } from '@nestjs/mongoose';

async function bootstrap() {
  const app = await NestFactory.create(UsersModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // Health endpoint for Kubernetes probes
  const server = app.getHttpAdapter().getInstance();
  server.get('/health', (_req, res) => res.status(200).send('ok'));

  await app.listen(process.env.PORT || 3002);
  console.log('Users service listening on', process.env.PORT || 3002);
}
bootstrap();
