import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../shared/guards/admin.guard';
import { ZodValidationPipe } from '../shared/pipes/zod-validation.pipe';
import {
  CreateProductInput,
  ProductQueryInput,
  UpdateProductInput,
  createProductSchema,
  productQuerySchema,
  updateProductSchema,
} from './dto';
import { ProductsService } from './products.service';

@ApiTags('商品')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // ===== 公开接口 =====

  @Get()
  @ApiOperation({ summary: '商品列表（分页，仅上架）' })
  findAll(
    @Query(new ZodValidationPipe(productQuerySchema)) query: ProductQueryInput,
  ) {
    return this.productsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '商品详情' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  // ===== 管理员接口 =====

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '创建商品（管理员）' })
  create(
    @Body(new ZodValidationPipe(createProductSchema)) dto: CreateProductInput,
  ) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '更新商品（管理员）' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductSchema)) dto: UpdateProductInput,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ summary: '删除商品（管理员）' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
