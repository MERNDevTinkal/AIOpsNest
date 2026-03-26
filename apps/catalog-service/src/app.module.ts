import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import configuration from '../../../src/config/configuration';
import { CatalogModule } from './catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/nest_auth_db'),
    CatalogModule,
  ],
})
export class AppModule {}
