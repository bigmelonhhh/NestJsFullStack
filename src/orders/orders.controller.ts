import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, RequestUser } from '../shared/decorators/current-user.decorator';
import { ZodValidationPipe } from '../shared/pipes/zod-validation.pipe';
import {
  CreateOrderInput,
  MyOrderQueryInput,
  createOrderSchema,
  myOrderQuerySchema,
} from './dto';
import { OrdersService } from './orders.service';

@ApiTags('订单')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: '下单（事务扣库存，防超卖）' })
  createOrder(
    @CurrentUser() user: RequestUser,
    @Body(new ZodValidationPipe(createOrderSchema)) dto: CreateOrderInput,
  ) {
    return this.ordersService.createOrder(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: '我的订单列表（分页）' })
  findMyOrders(
    @CurrentUser() user: RequestUser,
    @Query(new ZodValidationPipe(myOrderQuerySchema)) query: MyOrderQueryInput,
  ) {
    return this.ordersService.findMyOrders(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({ summary: '订单详情' })
  findOne(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
  ) {
    return this.ordersService.findOne(user.sub, id);
  }
}
