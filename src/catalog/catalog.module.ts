import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { Product, ProductSchema } from './product.schema';
import { FAQ, FAQSchema } from './faq.schema';
import { CMSConfig, CMSConfigSchema } from './cms-config.schema';
import { Subscription, SubscriptionSchema } from './subscription.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: FAQ.name, schema: FAQSchema },
      { name: CMSConfig.name, schema: CMSConfigSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    JwtModule,
    ConfigModule,
  ],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
