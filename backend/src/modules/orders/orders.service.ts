import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository, type FindOptionsWhere } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { BotService } from '../bot/bot.service';
import { ReceiptStorageService } from './receipt-storage.service';

const CUSTOMER_OVERVIEW_LIMIT = 4;
type StaffActor = {
  userId: number;
  role: UserRole;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly botService: BotService,
    private readonly receiptStorage: ReceiptStorageService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAllPaginated(
    page: number,
    limit: number,
    status: OrderStatus | undefined,
    actor: StaffActor,
  ) {
    const orderRepo = this.dataSource.getRepository(Order);
    const where: FindOptionsWhere<Order> = {};
    if (status) {
      where.status = status;
    }
    if (actor.role === UserRole.MERCHANT) {
      where.merchant = { id: actor.userId };
    }

    const [data, total] = await orderRepo.findAndCount({
      where: Object.keys(where).length > 0 ? where : undefined,
      relations: ['user', 'items', 'merchant'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async findCustomerPaginated(
    userId: number,
    page: number,
    limit: number,
    status?: OrderStatus,
    orderId?: number,
  ) {
    const orderRepo = this.dataSource.getRepository(Order);
    const where: FindOptionsWhere<Order> = { user: { id: userId } };
    if (status) {
      where.status = status;
    }
    if (orderId) {
      where.id = orderId;
    }

    const [data, total] = await orderRepo.findAndCount({
      where,
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async getStatusCounts(actor: StaffActor) {
    const orderRepo = this.dataSource.getRepository(Order);
    const query = orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .groupBy('order.status');

    if (actor.role === UserRole.MERCHANT) {
      query.where('order.merchantId = :merchantId', { merchantId: actor.userId });
    }

    const rows = await query.getRawMany<{ status: OrderStatus; count: string }>();

    const counts: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.APPROVED]: 0,
      [OrderStatus.SHIPPED]: 0,
      [OrderStatus.REJECTED]: 0,
      [OrderStatus.CANCELLED]: 0,
    };

    for (const row of rows) {
      const status = row.status;
      if (status in counts) {
        counts[status] = Number.parseInt(row.count, 10);
      }
    }

    const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return { counts, total };
  }

  async getCustomerOverview(userId: number) {
    const orderRepo = this.dataSource.getRepository(Order);

    const [totalOrders, pendingOrders] = await Promise.all([
      orderRepo.count({ where: { user: { id: userId } } }),
      orderRepo.count({
        where: { user: { id: userId }, status: OrderStatus.PENDING },
      }),
    ]);

    const mostBought = await orderRepo
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .leftJoin('item.product', 'product')
      .where('order.userId = :userId', { userId })
      .select('COALESCE(product.id, item.productId)', 'productId')
      .addSelect('COALESCE(product.name, item.productName)', 'productName')
      .addSelect('product.imageUrl', 'imageUrl')
      .addSelect('SUM(item.quantity)', 'quantity')
      .groupBy('productId')
      .addGroupBy('productName')
      .addGroupBy('product.imageUrl')
      .orderBy('quantity', 'DESC')
      .limit(1)
      .getRawOne<{
        productId: number | null;
        productName: string | null;
        imageUrl: string | null;
        quantity: string;
      }>();

    const chartRows = await orderRepo
      .createQueryBuilder('order')
      .innerJoin('order.items', 'item')
      .leftJoin('item.product', 'product')
      .where('order.userId = :userId', { userId })
      .andWhere('order.status = :status', { status: OrderStatus.APPROVED })
      .select('COALESCE(product.id, item.productId)', 'productId')
      .addSelect('COALESCE(product.name, item.productName)', 'productName')
      .addSelect('product.imageUrl', 'imageUrl')
      .addSelect('SUM(item.quantity)', 'quantity')
      .groupBy('productId')
      .addGroupBy('productName')
      .addGroupBy('product.imageUrl')
      .orderBy('quantity', 'DESC')
      .getRawMany<{
        productId: number | null;
        productName: string | null;
        imageUrl: string | null;
        quantity: string;
      }>();

    const orderRows = await orderRepo
      .createQueryBuilder('order')
      .where('order.userId = :userId', { userId })
      .select('order.id', 'id')
      .orderBy('order.createdAt', 'DESC')
      .limit(CUSTOMER_OVERVIEW_LIMIT)
      .getRawMany<{ id: number }>();

    const orderIds = orderRows.map((row) => row.id);
    const orders =
      orderIds.length > 0
        ? await orderRepo.find({
            where: orderIds.map((id) => ({ id })),
            relations: ['items', 'items.product'],
            order: { createdAt: 'DESC' },
          })
        : [];

    const recentOrders = orders.map((order) => ({
      id: order.id,
      status: order.status,
      createdAt: order.createdAt,
      totalAmount: Number(order.totalAmount),
      itemCount: order.items?.length ?? 0,
      items:
        order.items?.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          imageUrl: item.product?.imageUrl ?? null,
        })) ?? [],
    }));

    return {
      stats: {
        totalOrders,
        pendingOrders,
        mostBought: mostBought?.productName
          ? {
              productId: mostBought.productId,
              productName: mostBought.productName,
              imageUrl: mostBought.imageUrl ?? null,
              quantity: Number(mostBought.quantity),
            }
          : null,
      },
      orders: recentOrders,
      chart: chartRows.map((row) => ({
        productId: row.productId,
        productName: row.productName ?? 'Unknown product',
        imageUrl: row.imageUrl ?? null,
        quantity: Number(row.quantity),
      })),
    };
  }

  async create(
    userId: number,
    dto: CreateOrderDto,
    receipt?: { buffer: Buffer; filename?: string },
  ): Promise<Order> {
    return this.createOrder(userId, dto, receipt);
  }

  async createForUser(
    userId: number,
    dto: CreateOrderDto,
    receipt?: { buffer: Buffer; filename?: string },
  ): Promise<Order> {
    return this.createOrder(userId, dto, receipt);
  }

  private async createOrder(
    userId: number,
    dto: CreateOrderDto,
    receipt?: { buffer: Buffer; filename?: string },
  ): Promise<Order> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let receiptUrl: string | undefined;
    if (receipt?.buffer?.length) {
      receiptUrl = await this.receiptStorage.save(
        receipt.buffer,
        receipt.filename,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmountCents = 0;
      const orderItems: OrderItem[] = [];
      let merchantIdForOrder: number | null | undefined;
      const order = new Order();
      order.user = user;
      order.shippingAddress = dto.shippingAddress;
      if (receiptUrl) {
        order.receiptUrl = receiptUrl;
      }

      for (const itemDto of dto.items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: itemDto.productId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!product) {
          throw new NotFoundException(`Product ${itemDto.productId} not found`);
        }
        if (!product.isActive) {
          throw new BadRequestException(
            `Product "${product.name}" is currently unavailable`,
          );
        }
        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}". Available: ${product.stock}`,
          );
        }

        const productMerchantId = product.merchantId ?? null;
        if (merchantIdForOrder === undefined) {
          merchantIdForOrder = productMerchantId;
        } else if (merchantIdForOrder !== productMerchantId) {
          throw new BadRequestException(
            'All order items must belong to the same merchant',
          );
        }

        product.stock -= itemDto.quantity;
        await queryRunner.manager.save(product);

        const orderItem = new OrderItem();
        orderItem.product = product;
        orderItem.productName = product.name;
        orderItem.price = product.price;
        orderItem.quantity = itemDto.quantity;
        orderItems.push(orderItem);

        const priceCents = this.toCents(product.price);
        totalAmountCents += priceCents * itemDto.quantity;
      }

      if (merchantIdForOrder && merchantIdForOrder > 0) {
        const merchant = await queryRunner.manager.findOne(User, {
          where: { id: merchantIdForOrder, role: UserRole.MERCHANT },
        });
        if (!merchant) {
          throw new BadRequestException('Merchant account for this order is invalid');
        }
        order.merchant = merchant;
      }

      order.totalAmount = this.fromCents(totalAmountCents);
      order.items = orderItems.map((item) => {
        item.order = order;
        return item;
      });

      const savedOrder = await queryRunner.manager.save(Order, order);

      await queryRunner.commitTransaction();

      this.botService.notifyAdminNewOrder(savedOrder).catch((error) => {
        console.error('Failed to notify admin for new order', error);
      });

      const orderRepo = this.dataSource.getRepository(Order);
      const reloaded = await orderRepo.findOne({
        where: { id: savedOrder.id },
        relations: ['user', 'items', 'merchant'],
      });

      if (!reloaded) {
        return savedOrder;
      }

      this.botService.notifyMerchantNewOrder(reloaded).catch((error) => {
        console.error('Failed to notify merchant for new order', error);
      });

      return reloaded;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (receiptUrl) {
        this.receiptStorage.delete(receiptUrl).catch((cleanupError) => {
          console.error(
            'Failed to cleanup receipt after order rollback',
            cleanupError,
          );
        });
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    return this.updateStatusWithInventoryTransition(id, status);
  }

  async updateStatusAndNotify(
    id: number,
    status: OrderStatus,
    actor: StaffActor,
  ): Promise<Order> {
    const order = await this.updateStatusWithInventoryTransition(id, status, actor);

    if (order.user?.telegramId) {
      this.botService
        .notifyUserStatusChange(order.user.telegramId, order.id, status)
        .catch((error) => {
          console.error('Failed to notify user status change', error);
        });
    }

    return order;
  }

  async remove(id: number, actor: StaffActor) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(Order, {
        where: { id },
        relations: ['items', 'items.product', 'merchant'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!existing) {
        throw new NotFoundException('Order not found');
      }

      this.assertCanManageOrder(existing, actor);
      if (existing.status !== OrderStatus.CANCELLED) {
        throw new BadRequestException('Only cancelled orders can be deleted');
      }

      const receiptUrl = existing.receiptUrl;
      await queryRunner.manager.delete(Order, id);
      await queryRunner.commitTransaction();

      if (receiptUrl) {
        this.receiptStorage.delete(receiptUrl).catch((error) => {
          console.error('Failed to delete receipt after order removal', error);
        });
      }

      return { success: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteCustomerPendingOrder(userId: number, orderId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(Order, {
        where: { id: orderId, user: { id: userId } },
        relations: ['items', 'items.product'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!existing) {
        throw new NotFoundException('Order not found');
      }
      if (existing.status !== OrderStatus.PENDING) {
        throw new BadRequestException('Only pending orders can be deleted');
      }

      const receiptUrl = existing.receiptUrl;
      for (const item of existing.items ?? []) {
        const productId = item.product?.id;
        if (!productId) continue;

        const product = await queryRunner.manager.findOne(Product, {
          where: { id: productId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) continue;

        product.stock += item.quantity;
        await queryRunner.manager.save(Product, product);
      }

      await queryRunner.manager.delete(Order, orderId);
      await queryRunner.commitTransaction();

      if (receiptUrl) {
        this.receiptStorage.delete(receiptUrl).catch((error) => {
          console.error('Failed to delete receipt after customer order removal', error);
        });
      }

      return { success: true };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateReceipt(
    orderId: number,
    receipt: { buffer: Buffer; filename?: string },
    actor: StaffActor,
  ): Promise<Order> {
    const orderRepo = this.dataSource.getRepository(Order);
    const existing = await orderRepo.findOne({
      where: { id: orderId },
      relations: ['merchant'],
    });
    if (!existing) {
      throw new NotFoundException('Order not found');
    }
    this.assertCanManageOrder(existing, actor);

    const receiptUrl = await this.receiptStorage.save(
      receipt.buffer,
      receipt.filename,
    );
    const previous = existing.receiptUrl;
    existing.receiptUrl = receiptUrl;
    await orderRepo.save(existing);

    if (previous && previous !== receiptUrl) {
      this.receiptStorage.delete(previous).catch((error) => {
        console.error('Failed to cleanup previous receipt', error);
      });
    }

    const reloaded = await orderRepo.findOne({
      where: { id: orderId },
      relations: ['user', 'items'],
    });
    return reloaded ?? existing;
  }

  private assertCanManageOrder(order: Order, actor: StaffActor) {
    if (actor.role === UserRole.ADMIN) {
      return;
    }
    if (actor.role === UserRole.MERCHANT && order.merchantId === actor.userId) {
      return;
    }
    throw new NotFoundException('Order not found');
  }

  private async updateStatusWithInventoryTransition(
    id: number,
    status: OrderStatus,
    actor?: StaffActor,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(Order, {
        where: { id },
        relations: ['merchant', 'items', 'items.product', 'user'],
        lock: { mode: 'pessimistic_write' },
      });
      if (!existing) {
        throw new NotFoundException('Order not found');
      }

      if (actor) {
        this.assertCanManageOrder(existing, actor);
      }

      const wasReserved = this.isInventoryReservedStatus(existing.status);
      const willBeReserved = this.isInventoryReservedStatus(status);
      const requiresInventoryTransition = wasReserved !== willBeReserved;

      if (requiresInventoryTransition) {
        for (const item of existing.items ?? []) {
          const productId = item.product?.id;
          if (!productId) {
            if (willBeReserved) {
              throw new BadRequestException(
                `Cannot move order to ${status}: product "${item.productName}" no longer exists`,
              );
            }
            continue;
          }

          const product = await queryRunner.manager.findOne(Product, {
            where: { id: productId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!product) {
            if (willBeReserved) {
              throw new BadRequestException(
                `Cannot move order to ${status}: product "${item.productName}" no longer exists`,
              );
            }
            continue;
          }

          if (willBeReserved) {
            if (!product.isActive) {
              throw new BadRequestException(
                `Cannot move order to ${status}: "${item.productName}" is not published`,
              );
            }
            if (product.stock < item.quantity) {
              throw new BadRequestException(
                `Cannot move order to ${status}: insufficient stock for "${item.productName}"`,
              );
            }
            product.stock -= item.quantity;
          } else {
            product.stock += item.quantity;
          }

          await queryRunner.manager.save(Product, product);
        }
      }

      existing.status = status;
      await queryRunner.manager.save(Order, existing);
      await queryRunner.commitTransaction();

      const reloaded = await this.dataSource.getRepository(Order).findOne({
        where: { id },
        relations: ['user', 'items', 'merchant'],
      });
      if (!reloaded) {
        throw new NotFoundException('Order not found');
      }
      return reloaded;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private isInventoryReservedStatus(status: OrderStatus) {
    return status !== OrderStatus.CANCELLED && status !== OrderStatus.REJECTED;
  }

  private toCents(value: number | string): number {
    const normalized = String(value ?? '').trim();
    if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
      throw new BadRequestException(`Invalid money value "${normalized}"`);
    }

    const negative = normalized.startsWith('-');
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [wholePart, fractionalPart = ''] = unsigned.split('.');
    const cents =
      Number.parseInt(wholePart, 10) * 100 +
      Number.parseInt((fractionalPart + '00').slice(0, 2), 10);
    return negative ? -cents : cents;
  }

  private fromCents(cents: number): number {
    return Number((cents / 100).toFixed(2));
  }
}
