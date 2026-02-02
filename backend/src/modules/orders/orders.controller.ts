import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { type FastifyRequest } from 'fastify';
import { AuthGuard } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

type AuthenticatedRequest = FastifyRequest & {
  user: {
    userId: number;
    role: string;
  };
};

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.userId, dto);
  }
}
