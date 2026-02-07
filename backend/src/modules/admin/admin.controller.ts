import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DataSource } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  buildPaginationMeta,
  normalizePagination,
} from '../../common/pagination';
import { AuditService } from '../audit/audit.service';
import { OrderItem } from '../orders/entities/order-item.entity';
import { BroadcastService } from './broadcast.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import {
  BroadcastDeliveryFilter,
  ListBroadcastDeliveriesDto,
} from './dto/list-broadcast-deliveries.dto';
import { ListBroadcastUsersDto } from './dto/list-broadcast-users.dto';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly broadcastService: BroadcastService,
  ) {}

  @Get('dashboard-stats')
  async getStats() {
    const orderRepo = this.dataSource.getRepository(Order);

    const [totalOrders, pendingOrders, totalRevenue] = await Promise.all([
      orderRepo.count(),
      orderRepo.count({ where: { status: OrderStatus.PENDING } }),
      orderRepo
        .createQueryBuilder('order')
        .select('SUM(order.totalAmount)', 'sum')
        .where('order.status NOT IN (:...excludedStatuses)', {
          excludedStatuses: [OrderStatus.CANCELLED, OrderStatus.REJECTED],
        })
        .getRawOne<{ sum: string | null }>(),
    ]);

    return {
      totalOrders,
      pendingOrders,
      totalRevenue: totalRevenue?.sum ? Number(totalRevenue.sum) : 0,
    };
  }

  @Post('broadcast')
  async broadcastMessage(
    @Req() req,
    @Body() dto: CreateBroadcastDto,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = Number.parseInt(limit ?? '', 10);
    const take =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;
    const run = await this.broadcastService.queueBroadcast({
      message: dto.message,
      kind: dto.kind,
      target: dto.target,
      targetRole: dto.role,
      targetUserIds: dto.userIds,
      requestedByUserId: req?.user?.userId,
      limit: take,
    });

    return {
      runId: run.id,
      status: run.status,
      kind: run.kind,
      target: run.target,
      totalRecipients: run.totalRecipients,
      pendingCount: run.pendingCount,
    };
  }

  @Get('broadcast/runs')
  async listBroadcastRuns(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { page: safePage, limit: safeLimit } = normalizePagination(
      page,
      limit,
    );
    const { data, total } = await this.broadcastService.listRuns(
      safePage,
      safeLimit,
    );
    return { data, meta: buildPaginationMeta(total, safePage, safeLimit) };
  }

  @Get('broadcast/runs/:id')
  async getBroadcastRun(@Param('id', ParseIntPipe) id: number) {
    return this.broadcastService.getRun(id);
  }

  @Get('broadcast/runs/:id/deliveries')
  async listBroadcastRunDeliveries(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListBroadcastDeliveriesDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { page: safePage, limit: safeLimit } = normalizePagination(
      page,
      limit,
    );
    const { data, total } = await this.broadcastService.listRunDeliveries({
      runId: id,
      page: safePage,
      limit: safeLimit,
      filter: query.status ?? BroadcastDeliveryFilter.ALL,
    });
    return { data, meta: buildPaginationMeta(total, safePage, safeLimit) };
  }

  @Post('broadcast/runs/:id/cancel')
  async cancelBroadcastRun(@Param('id', ParseIntPipe) id: number) {
    return this.broadcastService.cancelRun(id);
  }

  @Post('broadcast/runs/:id/repost')
  async repostBroadcastRun(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const run = await this.broadcastService.repostRun({
      runId: id,
      requestedByUserId: req?.user?.userId,
    });

    return {
      runId: run.id,
      status: run.status,
      kind: run.kind,
      target: run.target,
      totalRecipients: run.totalRecipients,
      pendingCount: run.pendingCount,
    };
  }

  @Delete('broadcast/runs/:id')
  async deleteBroadcastRun(@Param('id', ParseIntPipe) id: number) {
    return this.broadcastService.deleteRun(id);
  }

  @Post('broadcast/runs/:id/requeue-unknown')
  async requeueUnknownBroadcastDeliveries(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.broadcastService.requeueUnknownDeliveries(id);
  }

  @Get('broadcast/users')
  async listBroadcastUsers(
    @Query() query: ListBroadcastUsersDto,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { page: safePage, limit: safeLimit } = normalizePagination(
      page,
      limit,
    );
    const { data, total } = await this.broadcastService.listBroadcastUsers({
      page: safePage,
      limit: safeLimit,
      search: query.search,
      role: query.role,
    });
    return { data, meta: buildPaginationMeta(total, safePage, safeLimit) };
  }

  @Get('users')
  async listUsers(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const {
      page: safePage,
      limit: safeLimit,
      skip,
    } = normalizePagination(page, limit);

    const userRepo = this.dataSource.getRepository(User);
    const qb = userRepo
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.CUSTOMER });

    if (search) {
      const searchValue = `%${search.toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(user.firstName) LIKE :search OR LOWER(user.username) LIKE :search OR user.telegramId LIKE :search)',
        { search: searchValue },
      );
    }

    const [data, total] = await qb
      .orderBy('user.createdAt', 'DESC')
      .skip(skip)
      .take(safeLimit)
      .getManyAndCount();

    return { data, meta: buildPaginationMeta(total, safePage, safeLimit) };
  }

  @Get('activity-logs')
  async listActivityLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { page: safePage, limit: safeLimit } = normalizePagination(
      page,
      limit,
    );
    const { data, total } = await this.auditService.findAllPaginated(
      safePage,
      safeLimit,
    );
    return { data, meta: buildPaginationMeta(total, safePage, safeLimit) };
  }

  @Get('dashboard-overview')
  async getDashboardOverview(
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedDays = Number.parseInt(days ?? '', 10);
    const rangeDays =
      Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 7;
    const parsedLimit = Number.parseInt(limit ?? '', 10);
    const take =
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10;

    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (rangeDays - 1));

    const orderRepo = this.dataSource.getRepository(Order);
    const orderItemRepo = this.dataSource.getRepository(OrderItem);

    const [stats, statusCounts, salesRows, topRows, customerRows] =
      await Promise.all([
        this.getStats(),
        orderRepo
          .createQueryBuilder('order')
          .select('order.status', 'status')
          .addSelect('COUNT(order.id)', 'count')
          .groupBy('order.status')
          .getRawMany<{ status: OrderStatus; count: string }>(),
        orderRepo
          .createQueryBuilder('order')
          .select('DATE(order.createdAt)', 'date')
          .addSelect('COUNT(order.id)', 'orderCount')
          .addSelect('COALESCE(SUM(order.totalAmount), 0)', 'revenue')
          .where('order.createdAt >= :startDate', { startDate })
          .andWhere('order.status NOT IN (:...excludedStatuses)', {
            excludedStatuses: [OrderStatus.CANCELLED, OrderStatus.REJECTED],
          })
          .groupBy('DATE(order.createdAt)')
          .orderBy('DATE(order.createdAt)', 'ASC')
          .getRawMany<{ date: string; orderCount: string; revenue: string }>(),
        orderItemRepo
          .createQueryBuilder('item')
          .leftJoin('item.order', 'order')
          .select('item.productName', 'productName')
          .addSelect('SUM(item.quantity)', 'quantity')
          .addSelect('SUM(item.quantity * item.price)', 'revenue')
          .where('order.status NOT IN (:...excludedStatuses)', {
            excludedStatuses: [OrderStatus.CANCELLED, OrderStatus.REJECTED],
          })
          .groupBy('item.productName')
          .orderBy('revenue', 'DESC')
          .limit(take)
          .getRawMany<{
            productName: string;
            quantity: string;
            revenue: string;
          }>(),
        orderRepo
          .createQueryBuilder('order')
          .leftJoin('order.user', 'user')
          .select('user.id', 'userId')
          .addSelect('user.firstName', 'firstName')
          .addSelect('user.username', 'username')
          .addSelect('COUNT(order.id)', 'totalOrders')
          .addSelect(
            "SUM(CASE WHEN order.status = 'PENDING' THEN 1 ELSE 0 END)",
            'pendingOrders',
          )
          .addSelect(
            "SUM(CASE WHEN order.status = 'APPROVED' THEN 1 ELSE 0 END)",
            'approvedOrders',
          )
          .addSelect(
            "SUM(CASE WHEN order.status = 'SHIPPED' THEN 1 ELSE 0 END)",
            'shippedOrders',
          )
          .addSelect(
            "SUM(CASE WHEN order.status = 'REJECTED' THEN 1 ELSE 0 END)",
            'rejectedOrders',
          )
          .addSelect(
            "SUM(CASE WHEN order.status = 'CANCELLED' THEN 1 ELSE 0 END)",
            'cancelledOrders',
          )
          .groupBy('user.id')
          .orderBy('totalOrders', 'DESC')
          .limit(take)
          .getRawMany<{
            userId: string;
            firstName: string | null;
            username: string | null;
            totalOrders: string;
            pendingOrders: string;
            approvedOrders: string;
            shippedOrders: string;
            rejectedOrders: string;
            cancelledOrders: string;
          }>(),
      ]);

    const counts: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.APPROVED]: 0,
      [OrderStatus.SHIPPED]: 0,
      [OrderStatus.REJECTED]: 0,
      [OrderStatus.CANCELLED]: 0,
    };

    for (const row of statusCounts) {
      const status = row.status;
      if (status in counts) {
        counts[status] = Number.parseInt(row.count, 10);
      }
    }

    const statusSummary = {
      counts,
      total: Object.values(counts).reduce((sum, value) => sum + value, 0),
    };

    const salesMap = new Map(
      salesRows.map((row) => [
        row.date,
        {
          orderCount: Number.parseInt(row.orderCount, 10) || 0,
          revenue: Number.parseFloat(row.revenue) || 0,
        },
      ]),
    );

    const salesTrend: Array<{
      date: string;
      orderCount: number;
      revenue: number;
    }> = [];
    for (let i = 0; i < rangeDays; i += 1) {
      const current = new Date(startDate);
      current.setUTCDate(startDate.getUTCDate() + i);
      const isoDate = this.toUtcDate(current);
      const values = salesMap.get(isoDate) ?? { orderCount: 0, revenue: 0 };
      salesTrend.push({ date: isoDate, ...values });
    }

    const topProducts = topRows.map((row) => ({
      productName: row.productName,
      quantity: Number.parseInt(row.quantity, 10) || 0,
      revenue: Number.parseFloat(row.revenue) || 0,
    }));

    const bestCustomers = customerRows.map((row) => ({
      userId: Number.parseInt(row.userId, 10) || 0,
      firstName: row.firstName ?? 'Unknown',
      username: row.username ?? 'no_username',
      totalOrders: Number.parseInt(row.totalOrders, 10) || 0,
      statusCounts: {
        PENDING: Number.parseInt(row.pendingOrders, 10) || 0,
        APPROVED: Number.parseInt(row.approvedOrders, 10) || 0,
        SHIPPED: Number.parseInt(row.shippedOrders, 10) || 0,
        REJECTED: Number.parseInt(row.rejectedOrders, 10) || 0,
        CANCELLED: Number.parseInt(row.cancelledOrders, 10) || 0,
      },
    }));

    return {
      stats,
      statusSummary,
      salesTrend,
      topProducts,
      bestCustomers,
    };
  }

  private toUtcDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
