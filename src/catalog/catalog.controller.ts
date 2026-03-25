import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/roles.enum';
import { CreateProductDto, UpdateProductDto, CreateFAQDto } from './dto/catalog.dto';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('products')
  findAllProducts() {
    return this.catalogService.findAllProducts();
  }

  @Get('products/:id')
  findProductById(@Param('id') id: string) {
    return this.catalogService.findProductById(id);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  createProduct(@Body() dto: CreateProductDto) {
    return this.catalogService.createProduct(dto);
  }

  @Put('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.catalogService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  deleteProduct(@Param('id') id: string) {
    return this.catalogService.deleteProduct(id);
  }

  @Get('faqs')
  findAllFAQs() {
    return this.catalogService.findAllFAQs();
  }

  @Post('faqs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  createFAQ(@Body() dto: CreateFAQDto) {
    return this.catalogService.createFAQ(dto);
  }

  @Get('config/:key')
  getConfig(@Param('key') key: string) {
    return this.catalogService.getConfig(key);
  }

  @Post('config/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  setConfig(@Param('key') key: string, @Body() value: any) {
    return this.catalogService.setConfig(key, value);
  }

  @Post('subscribe')
  subscribe(@Body('email') email: string) {
    return this.catalogService.subscribe(email);
  }

  @Get('subscriptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAllSubscriptions() {
    return this.catalogService.findAllSubscriptions();
  }
}
