import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DataSource, type FindOptionsWhere, type SelectQueryBuilder } from 'typeorm';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  buildPaginationMeta,
  normalizePagination,
} from '../../common/pagination';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { User, UserRole } from '../users/entities/user.entity';
import {
  CustomerAccountStateFilter,
  CustomerListSortBy,
  CustomerOrderActivityFilter,
  ListAdminCustomersDto,
} from './dto/list-admin-customers.dto';
import { ListCustomerOrdersDto } from './dto/list-customer-orders.dto';

const CUSTOMER_TREND_MONTHS = 6;

const STATUS_COUNT_EXPRESSIONS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]:
    "COALESCE(SUM(CASE WHEN order.status = 'PENDING' THEN 1 ELSE 0 END), 0)",
  [OrderStatus.APPROVED]:
    "COALESCE(SUM(CASE WHEN order.status = 'APPROVED' THEN 1 ELSE 0 END), 0)",
  [OrderStatus.SHIPPED]:
    "COALESCE(SUM(CASE WHEN order.status = 'SHIPPED' THEN 1 ELSE 0 END), 0)",
  [OrderStatus.REJECTED]:
    "COALESCE(SUM(CASE WHEN order.status = 'REJECTED' THEN 1 ELSE 0 END), 0)",
  [OrderStatus.CANCELLED]:
    "COALESCE(SUM(CASE WHEN order.status = 'CANCELLED' THEN 1 ELSE 0 END), 0)",
};

type RawCustomerListRow = {
  id: number;
  firstName: string | null;
  username: string | null;
  loginUsername: string | null;
  telegramId: string | null;
  avatarUrl: string | null;
  isBanned: number | boolean | null;
  createdAt: string;
  updatedAt: string;
  totalOrders: string;
  pendingOrders: string;
  approvedOrders: string;
  shippedOrders: string;
  rejectedOrders: string;
  cancelledOrders: string;
  totalSpent: string;
  lastOrderAt: string | null;
};

type RawCustomerSummaryRow = {
  totalOrders: string;
  pendingOrders: string;
  approvedOrders: string;
  shippedOrders: string;
  rejectedOrders: string;
  cancelledOrders: string;
  totalSpent: string;
  averageOrderValue: string | null;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
};

@Controller('admin/customers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminCustomersController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async listCustomers(
    @Query() query: ListAdminCustomersDto,
  ) {
    const { page: safePage, limit: safeLimit, skip } = normalizePagination(
      query.page ? String(query.page) : undefined,
      query.limit ? String(query.limit) : undefined,
    );

    const customerQuery = this.buildCustomerListQuery({
      search: query.search,
      accountState: query.accountState ?? CustomerAccountStateFilter.ALL,
      orderActivity: query.orderActivity ?? CustomerOrderActivityFilter.ALL,
      sortBy: query.sortBy ?? CustomerListSortBy.NEWEST,
    });

    const totalRows = await customerQuery
      .clone()
      .select('user.id', 'id')
      .getRawMany<{ id: number }>();
    const total = totalRows.length;

    const rows = await customerQuery
      .clone()
      .select('user.id', 'id')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.username', 'username')
      .addSelect('user.loginUsername', 'loginUsername')
      .addSelect('user.telegramId', 'telegramId')
      .addSelect('user.avatarUrl', 'avatarUrl')
      .addSelect('user.isBanned', 'isBanned')
      .addSelect('user.createdAt', 'createdAt')
      .addSelect('user.updatedAt', 'updatedAt')
      .addSelect('COUNT(order.id)', 'totalOrders')
      .addSelect(STATUS_COUNT_EXPRESSIONS[OrderStatus.PENDING], 'pendingOrders')
      .addSelect(STATUS_COUNT_EXPRESSIONS[OrderStatus.APPROVED], 'approvedOrders')
      .addSelect(STATUS_COUNT_EXPRESSIONS[OrderStatus.SHIPPED], 'shippedOrders')
      .addSelect(STATUS_COUNT_EXPRESSIONS[OrderStatus.REJECTED], 'rejectedOrders')
      .addSelect(
        STATUS_COUNT_EXPRESSIONS[OrderStatus.CANCELLED],
        'cancelledOrders',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN order.status NOT IN ('CANCELLED','REJECTED') THEN order.totalAmount ELSE 0 END), 0)",
        'totalSpent',
      )
      .addSelect('MAX(order.createdAt)', 'lastOrderAt')
      .offset(skip)
      .limit(safeLimit)
      .getRawMany<RawCustomerListRow>();

    return {
      data: rows.map((row) => ({
        id: this.toNumber(row.id),
        firstName: row.firstName ?? 'Unknown',
        username: row.username,
        loginUsername: row.loginUsername,
        telegramId: row.telegramId,
        avatarUrl: row.avatarUrl,
        role: UserRole.CUSTOMER,
        isBanned: Boolean(row.isBanned),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        orderStats: {
          totalOrders: this.toNumber(row.totalOrders),
          totalSpent: this.toNumber(row.totalSpent),
          lastOrderAt: row.lastOrderAt,
          statusCounts: {
            [OrderStatus.PENDING]: this.toNumber(row.pendingOrders),
            [OrderStatus.APPROVED]: this.toNumber(row.approvedOrders),
            [OrderStatus.SHIPPED]: this.toNumber(row.shippedOrders),
            [OrderStatus.REJECTED]: this.toNumber(row.rejectedOrders),
            [OrderStatus.CANCELLED]: this.toNumber(row.cancelledOrders),
          },
        },
      })),
      meta: buildPaginationMeta(total, safePage, safeLimit),
    };
  }

  @Get(':id/orders')
  async listCustomerOrders(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListCustomerOrdersDto,
  ) {
    await this.getCustomerOrThrow(id);

    const { page: safePage, limit: safeLimit } = normalizePagination(
      query.page ? String(query.page) : undefined,
      query.limit ? String(query.limit) : undefined,
    );
    const where: FindOptionsWhere<Order> = { user: { id } };

    if (query.status) {
      where.status = query.status;
    }

    const orderIdFilter = this.parseOrderIdSearch(query.q);
    if (orderIdFilter) {
      where.id = orderIdFilter;
    }

    const orderRepo = this.dataSource.getRepository(Order);
    const [data, total] = await orderRepo.findAndCount({
      where,
      relations: ['user', 'items', 'merchant'],
      order: { createdAt: 'DESC' },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
    });

    return {
      data,
      meta: buildPaginationMeta(total, safePage, safeLimit),
    };
  }

  @Get(':id')
  async getCustomerDetail(@Param('id', ParseIntPipe) id: number) {
    const customer = await this.getCustomerOrThrow(id);
    const orderRepo = this.dataSource.getRepository(Order);

    const summary = await orderRepo
      .createQueryBuilder('order')
      .select('COUNT(order.id)', 'totalOrders')
      .addSelect(STATUS_COUNT_EXPRESSIONS[OrderStatus.PENDING], 'pendingOrders')
      .addSelect(STATUS_COUNT_EXPRESSIONS[OrderStatus.APPROVED], 'approvedOrders')
      .addSelect(STATUS_COUNT_EXPRESSIONS[OrderStatus.SHIPPED], 'shippedOrders')
      .addSelect(STATUS_COUNT_EXPRESSIONS[OrderStatus.REJECTED], 'rejectedOrders')
      .addSelect(
        STATUS_COUNT_EXPRESSIONS[OrderStatus.CANCELLED],
        'cancelledOrders',
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN order.status NOT IN ('CANCELLED','REJECTED') THEN order.totalAmount ELSE 0 END), 0)",
        'totalSpent',
      )
      .addSelect(
        "COALESCE(AVG(CASE WHEN order.status NOT IN ('CANCELLED','REJECTED') THEN order.totalAmount ELSE NULL END), 0)",
        'averageOrderValue',
      )
      .addSelect('MIN(order.createdAt)', 'firstOrderAt')
      .addSelect('MAX(order.createdAt)', 'lastOrderAt')
      .where('order.userId = :userId', { userId: id })
      .getRawOne<RawCustomerSummaryRow>();

    const startMonth = new Date();
    startMonth.setUTCHours(0, 0, 0, 0);
    startMonth.setUTCDate(1);
    startMonth.setUTCMonth(
      startMonth.getUTCMonth() - (CUSTOMER_TREND_MONTHS - 1),
    );

    const trendRows = await orderRepo
      .createQueryBuilder('order')
      .select("DATE_FORMAT(order.createdAt, '%Y-%m')", 'month')
      .addSelect('COUNT(order.id)', 'orderCount')
      .addSelect(
        "COALESCE(SUM(CASE WHEN order.status NOT IN ('CANCELLED','REJECTED') THEN order.totalAmount ELSE 0 END), 0)",
        'totalSpent',
      )
      .where('order.userId = :userId', { userId: id })
      .andWhere('order.createdAt >= :startMonth', { startMonth })
      .groupBy("DATE_FORMAT(order.createdAt, '%Y-%m')")
      .orderBy('month', 'ASC')
      .getRawMany<{
        month: string;
        orderCount: string;
        totalSpent: string;
      }>();

    const topShippingRows = await orderRepo
      .createQueryBuilder('order')
      .select('order.shippingAddress', 'shippingAddress')
      .addSelect('COUNT(order.id)', 'count')
      .where('order.userId = :userId', { userId: id })
      .andWhere('order.shippingAddress IS NOT NULL')
      .andWhere("TRIM(order.shippingAddress) != ''")
      .groupBy('order.shippingAddress')
      .orderBy('count', 'DESC')
      .addOrderBy('MAX(order.createdAt)', 'DESC')
      .limit(3)
      .getRawMany<{ shippingAddress: string; count: string }>();

    const statusCounts = {
      [OrderStatus.PENDING]: this.toNumber(summary?.pendingOrders),
      [OrderStatus.APPROVED]: this.toNumber(summary?.approvedOrders),
      [OrderStatus.SHIPPED]: this.toNumber(summary?.shippedOrders),
      [OrderStatus.REJECTED]: this.toNumber(summary?.rejectedOrders),
      [OrderStatus.CANCELLED]: this.toNumber(summary?.cancelledOrders),
    };
    const totalOrders = this.toNumber(summary?.totalOrders);
    const totalSpent = this.toNumber(summary?.totalSpent);
    const averageOrderValue = this.toNumber(summary?.averageOrderValue);

    const monthlyTrendMap = new Map(
      trendRows.map((row) => [
        row.month,
        {
          orderCount: this.toNumber(row.orderCount),
          totalSpent: this.toNumber(row.totalSpent),
        },
      ]),
    );

    const monthlyTrend = Array.from({ length: CUSTOMER_TREND_MONTHS }).map(
      (_, index) => {
        const current = new Date(startMonth);
        current.setUTCMonth(startMonth.getUTCMonth() + index);
        const month = this.toYearMonth(current);
        const values = monthlyTrendMap.get(month) ?? {
          orderCount: 0,
          totalSpent: 0,
        };
        return {
          month,
          label: current.toLocaleDateString('en-US', {
            month: 'short',
            timeZone: 'UTC',
          }),
          orderCount: values.orderCount,
          totalSpent: values.totalSpent,
        };
      },
    );

    return {
      customer: {
        id: customer.id,
        firstName: customer.firstName ?? 'Unknown',
        username: customer.username,
        loginUsername: customer.loginUsername,
        telegramId: customer.telegramId,
        avatarUrl: customer.avatarUrl,
        role: customer.role,
        isBanned: customer.isBanned,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
        orderStats: {
          totalOrders,
          totalSpent,
          lastOrderAt: summary?.lastOrderAt ?? null,
          statusCounts,
        },
      },
      report: {
        totalOrders,
        totalSpent,
        averageOrderValue,
        firstOrderAt: summary?.firstOrderAt ?? null,
        lastOrderAt: summary?.lastOrderAt ?? null,
        statusCounts,
        monthlyTrend,
        topShippingAddresses: topShippingRows.map((row) => ({
          shippingAddress: row.shippingAddress,
          count: this.toNumber(row.count),
        })),
      },
    };
  }

  private buildCustomerListQuery({
    search,
    accountState,
    orderActivity,
    sortBy,
  }: {
    search?: string;
    accountState: CustomerAccountStateFilter;
    orderActivity: CustomerOrderActivityFilter;
    sortBy: CustomerListSortBy;
  }): SelectQueryBuilder<User> {
    const userRepo = this.dataSource.getRepository(User);
    const query = userRepo
      .createQueryBuilder('user')
      .leftJoin(Order, 'order', 'order.userId = user.id')
      .where('user.role = :role', { role: UserRole.CUSTOMER });

    const trimmedSearch = search?.trim();
    if (trimmedSearch) {
      const loweredSearch = `%${trimmedSearch.toLowerCase()}%`;
      query.andWhere(
        `(
          LOWER(COALESCE(user.firstName, '')) LIKE :search OR
          LOWER(COALESCE(user.username, '')) LIKE :search OR
          LOWER(COALESCE(user.loginUsername, '')) LIKE :search OR
          CAST(user.telegramId AS CHAR) LIKE :search OR
          CAST(user.id AS CHAR) LIKE :search
        )`,
        { search: loweredSearch },
      );
    }

    if (accountState === CustomerAccountStateFilter.ACTIVE) {
      query.andWhere('user.isBanned = :isBanned', { isBanned: false });
    } else if (accountState === CustomerAccountStateFilter.ARCHIVED) {
      query.andWhere('user.isBanned = :isBanned', { isBanned: true });
    }

    query
      .groupBy('user.id')
      .addGroupBy('user.firstName')
      .addGroupBy('user.username')
      .addGroupBy('user.loginUsername')
      .addGroupBy('user.telegramId')
      .addGroupBy('user.avatarUrl')
      .addGroupBy('user.isBanned')
      .addGroupBy('user.createdAt')
      .addGroupBy('user.updatedAt');

    this.applyOrderActivityFilter(query, orderActivity);
    this.applyCustomerSort(query, sortBy);

    return query;
  }

  private applyOrderActivityFilter(
    query: SelectQueryBuilder<User>,
    orderActivity: CustomerOrderActivityFilter,
  ) {
    switch (orderActivity) {
      case CustomerOrderActivityFilter.NO_ORDERS:
        query.having('COUNT(order.id) = 0');
        return;
      case CustomerOrderActivityFilter.HAS_PENDING:
        query.having(`${STATUS_COUNT_EXPRESSIONS[OrderStatus.PENDING]} > 0`);
        return;
      case CustomerOrderActivityFilter.HAS_APPROVED:
        query.having(`${STATUS_COUNT_EXPRESSIONS[OrderStatus.APPROVED]} > 0`);
        return;
      case CustomerOrderActivityFilter.HAS_SHIPPED:
        query.having(`${STATUS_COUNT_EXPRESSIONS[OrderStatus.SHIPPED]} > 0`);
        return;
      case CustomerOrderActivityFilter.HAS_REJECTED:
        query.having(`${STATUS_COUNT_EXPRESSIONS[OrderStatus.REJECTED]} > 0`);
        return;
      case CustomerOrderActivityFilter.HAS_CANCELLED:
        query.having(`${STATUS_COUNT_EXPRESSIONS[OrderStatus.CANCELLED]} > 0`);
        return;
      case CustomerOrderActivityFilter.ALL:
      default:
        return;
    }
  }

  private applyCustomerSort(
    query: SelectQueryBuilder<User>,
    sortBy: CustomerListSortBy,
  ) {
    switch (sortBy) {
      case CustomerListSortBy.OLDEST:
        query.orderBy('user.createdAt', 'ASC').addOrderBy('user.id', 'ASC');
        return;
      case CustomerListSortBy.MOST_ORDERS:
        query
          .orderBy('COUNT(order.id)', 'DESC')
          .addOrderBy('MAX(order.createdAt)', 'DESC')
          .addOrderBy('user.createdAt', 'DESC');
        return;
      case CustomerListSortBy.HIGHEST_SPEND:
        query
          .orderBy(
            "COALESCE(SUM(CASE WHEN order.status NOT IN ('CANCELLED','REJECTED') THEN order.totalAmount ELSE 0 END), 0)",
            'DESC',
          )
          .addOrderBy('MAX(order.createdAt)', 'DESC')
          .addOrderBy('user.createdAt', 'DESC');
        return;
      case CustomerListSortBy.LAST_ORDER:
        query
          .orderBy('CASE WHEN MAX(order.createdAt) IS NULL THEN 1 ELSE 0 END', 'ASC')
          .addOrderBy('MAX(order.createdAt)', 'DESC')
          .addOrderBy('user.createdAt', 'DESC');
        return;
      case CustomerListSortBy.NEWEST:
      default:
        query.orderBy('user.createdAt', 'DESC').addOrderBy('user.id', 'DESC');
    }
  }

  private parseOrderIdSearch(query?: string): number | undefined {
    const trimmed = String(query ?? '').trim();
    if (!trimmed) {
      return undefined;
    }

    if (!/^\d+$/.test(trimmed)) {
      throw new BadRequestException('Invalid order search query');
    }
    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('Invalid order search query');
    }
    return parsed;
  }

  private async getCustomerOrThrow(customerId: number): Promise<User> {
    const userRepo = this.dataSource.getRepository(User);
    const customer = await userRepo.findOne({
      where: {
        id: customerId,
        role: UserRole.CUSTOMER,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  private toNumber(value: unknown): number {
    const parsed =
      typeof value === 'number' ? value : Number.parseFloat(String(value ?? 0));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private toYearMonth(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
