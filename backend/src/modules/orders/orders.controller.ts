import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type FastifyRequest } from 'fastify';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { buildPaginationMeta, normalizePagination } from '../../common/pagination';
import { OrderStatus } from './entities/order.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateAdminOrderDto } from './dto/create-admin-order.dto';

type AuthenticatedRequest = FastifyRequest & {
  user: {
    userId: number;
    role: string;
  };
};

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const { page: safePage, limit: safeLimit } = normalizePagination(page, limit);
    let parsedStatus: OrderStatus | undefined;
    if (status) {
      if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
        throw new BadRequestException('Invalid order status');
      }
      parsedStatus = status as OrderStatus;
    }

    const { data, total } = await this.ordersService.findAllPaginated(
      safePage,
      safeLimit,
      parsedStatus,
    );
    return { data, meta: buildPaginationMeta(total, safePage, safeLimit) };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('status-counts')
  getStatusCounts() {
    return this.ordersService.getStatusCounts();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post('admin')
  createForUser(@Body() dto: CreateAdminOrderDto) {
    return this.ordersService.createForUser(dto.userId, {
      items: dto.items,
      shippingAddress: dto.shippingAddress,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatusAndNotify(id, dto.status);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id);
  }
}
