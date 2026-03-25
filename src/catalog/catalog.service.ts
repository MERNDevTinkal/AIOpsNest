import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from './product.schema';
import { FAQ } from './faq.schema';
import { CMSConfig } from './cms-config.schema';
import { Subscription } from './subscription.schema';
import { CreateProductDto, UpdateProductDto, CreateFAQDto } from './dto/catalog.dto';

@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(FAQ.name) private faqModel: Model<FAQ>,
    @InjectModel(CMSConfig.name) private cmsConfigModel: Model<CMSConfig>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<Subscription>,
  ) {}

  // Products
  async createProduct(dto: CreateProductDto) {
    return new this.productModel(dto).save();
  }

  async findAllProducts() {
    return this.productModel.find().exec();
  }

  async findProductById(id: string) {
    const product = await this.productModel.findById(id).exec();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    return this.productModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async deleteProduct(id: string) {
    return this.productModel.findByIdAndDelete(id).exec();
  }

  // FAQs
  async createFAQ(dto: CreateFAQDto) {
    return new this.faqModel(dto).save();
  }

  async findAllFAQs() {
    return this.faqModel.find().sort({ order: 1 }).exec();
  }

  // CMS Config
  async setConfig(key: string, value: any) {
    return this.cmsConfigModel.findOneAndUpdate({ key }, { value }, { upsert: true, new: true }).exec();
  }

  async getConfig(key: string) {
    const config = await this.cmsConfigModel.findOne({ key }).exec();
    if (!config) throw new NotFoundException(`Config for ${key} not found`);
    return config.value;
  }

  // Subscriptions
  async subscribe(email: string) {
    return this.subscriptionModel.findOneAndUpdate({ email }, { isActive: true }, { upsert: true, new: true }).exec();
  }

  async findAllSubscriptions() {
    return this.subscriptionModel.find().exec();
  }
}
