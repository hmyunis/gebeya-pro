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
import {
  buildPaginationMeta,
  normalizePagination,
} from '../../common/pagination';
import { OrderStatus } from './entities/order.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateAdminOrderDto } from './dto/create-admin-order.dto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import {
  assertMultipartRequest,
  coerceMultipartFieldValue,
  readMultipartFileToBuffer,
} from '../../common/multipart';

type AuthenticatedRequest = FastifyRequest & {
  user: {
    userId: number;
    role: UserRole;
  };
};

const MAX_ORDER_RECEIPT_BYTES = 25 * 1024 * 1024;
const MAX_ORDER_MULTIPART_FIELDS = 10;

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const { page: safePage, limit: safeLimit } = normalizePagination(
      page,
      limit,
    );
    const parsedStatus = this.parseStatus(status);

    const { data, total } = await this.ordersService.findAllPaginated(
      safePage,
      safeLimit,
      parsedStatus,
      req.user,
    );
    return { data, meta: buildPaginationMeta(total, safePage, safeLimit) };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Get('status-counts')
  getStatusCounts(@Req() req: AuthenticatedRequest) {
    return this.ordersService.getStatusCounts(req.user);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('overview')
  async getOverview(@Req() req: AuthenticatedRequest) {
    return this.ordersService.getCustomerOverview(req.user.userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my')
  async findMyOrders(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('q') q?: string,
  ) {
    const { page: safePage, limit: safeLimit } = normalizePagination(
      page,
      limit,
    );
    const parsedStatus = this.parseStatus(status);

    const trimmed = String(q ?? '').trim();
    let orderId: number | undefined;
    if (trimmed.length > 0) {
      if (!/^\d+$/.test(trimmed)) {
        throw new BadRequestException('Invalid order search query');
      }
      const parsed = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new BadRequestException('Invalid order search query');
      }
      orderId = parsed;
    }

    const { data, total } = await this.ordersService.findCustomerPaginated(
      req.user.userId,
      safePage,
      safeLimit,
      parsedStatus,
      orderId,
    );

    return { data, meta: buildPaginationMeta(total, safePage, safeLimit) };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('my/:id')
  deleteMyPendingOrder(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.deleteCustomerPendingOrder(req.user.userId, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Req() req: AuthenticatedRequest) {
    const { dto, receipt } = await this.parseCreateOrderRequest(req);
    return this.ordersService.create(req.user.userId, dto, receipt);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('admin')
  createForUser(@Body() dto: CreateAdminOrderDto) {
    return this.ordersService.createForUser(dto.userId, {
      items: dto.items,
      shippingAddress: dto.shippingAddress,
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Patch(':id/status')
  updateStatus(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatusAndNotify(id, dto.status, req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Patch(':id/receipt')
  async updateReceipt(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const receipt = await this.parseReceiptFile(req);
    return this.ordersService.updateReceipt(id, receipt, req.user);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.remove(id, req.user);
  }

  private async parseCreateOrderRequest(req: FastifyRequest): Promise<{
    dto: CreateOrderDto;
    receipt?: { buffer: Buffer; filename?: string };
  }> {
    const contentType = String(req.headers['content-type'] ?? '');
    if (contentType.includes('multipart/form-data')) {
      const parts = (req as any).parts?.();
      if (!parts) {
        throw new BadRequestException('Invalid multipart request');
      }

      const body: Record<string, unknown> = {};
      let receipt: { buffer: Buffer; filename?: string } | undefined;
      let fieldCount = 0;
      let receiptCount = 0;

      for await (const part of parts) {
        if (part.type === 'file') {
          if (part.fieldname !== 'receipt') {
            throw new BadRequestException(
              `Unexpected file field "${part.fieldname}"`,
            );
          }

          receiptCount += 1;
          if (receiptCount > 1) {
            throw new BadRequestException('Only one receipt file is allowed');
          }

          const buffer = await readMultipartFileToBuffer(part, {
            maxBytes: MAX_ORDER_RECEIPT_BYTES,
            errorLabel: 'Receipt file',
          });
          if (buffer.length > 0) {
            receipt = { buffer, filename: part.filename };
          }
        } else {
          fieldCount += 1;
          if (fieldCount > MAX_ORDER_MULTIPART_FIELDS) {
            throw new BadRequestException('Too many multipart fields');
          }
          body[part.fieldname] = coerceMultipartFieldValue(
            part.value,
            part.fieldname,
          );
        }
      }

      if (typeof body.items === 'string') {
        try {
          body.items = JSON.parse(body.items);
        } catch {
          throw new BadRequestException('Invalid items payload');
        }
      }

      const dto = plainToInstance(CreateOrderDto, body);
      const errors = await validate(dto);
      if (errors.length > 0) {
        throw new BadRequestException(errors);
      }
      return { dto, receipt };
    }

    const dto = plainToInstance(CreateOrderDto, (req as any).body ?? {});
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
    return { dto };
  }

  private async parseReceiptFile(
    req: FastifyRequest,
  ): Promise<{ buffer: Buffer; filename?: string }> {
    assertMultipartRequest(req);

    const parts = (req as any).parts?.();
    if (!parts) {
      throw new BadRequestException('Invalid multipart request');
    }

    let receipt: { buffer: Buffer; filename?: string } | undefined;
    let receiptCount = 0;
    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname !== 'receipt') {
          throw new BadRequestException(
            `Unexpected file field "${part.fieldname}"`,
          );
        }

        receiptCount += 1;
        if (receiptCount > 1) {
          throw new BadRequestException('Only one receipt file is allowed');
        }

        const buffer = await readMultipartFileToBuffer(part, {
          maxBytes: MAX_ORDER_RECEIPT_BYTES,
          errorLabel: 'Receipt file',
        });
        if (buffer.length) {
          receipt = { buffer, filename: part.filename };
        }
      }
    }

    if (!receipt) {
      throw new BadRequestException('Receipt file is required');
    }
    return receipt;
  }

  private parseStatus(status?: string): OrderStatus | undefined {
    if (!status) return undefined;
    if (!Object.values(OrderStatus).includes(status as OrderStatus)) {
      throw new BadRequestException('Invalid order status');
    }
    return status as OrderStatus;
  }
}
