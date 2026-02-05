import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { BotService } from '../bot/bot.service';
import { ReceiptStorageService } from './receipt-storage.service';

const CUSTOMER_OVERVIEW_LIMIT = 6;

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly botService: BotService,
    private readonly receiptStorage: ReceiptStorageService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async findAllPaginated(page: number, limit: number, status?: OrderStatus) {
    const orderRepo = this.dataSource.getRepository(Order);
    const where = status ? { status } : undefined;
    const [data, total] = await orderRepo.findAndCount({
      where,
      relations: ['user', 'items'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async getStatusCounts() {
    const orderRepo = this.dataSource.getRepository(Order);
    const rows = await orderRepo
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .groupBy('order.status')
      .getRawMany<{ status: OrderStatus; count: string }>();

    const counts: Record<OrderStatus, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.APPROVED]: 0,
      [OrderStatus.SHIPPED]: 0,
      [OrderStatus.REJECTED]: 0,
      [OrderStatus.CANCELLED]: 0,
    };

    for (const row of rows) {
      const status = row.status as OrderStatus;
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
      receiptUrl = await this.receiptStorage.save(receipt.buffer, receipt.filename);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];
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
        product.stock -= itemDto.quantity;
        await queryRunner.manager.save(product);

        const orderItem = new OrderItem();
        orderItem.product = product;
        orderItem.productName = product.name;
        orderItem.price = product.price;
        orderItem.quantity = itemDto.quantity;
        orderItems.push(orderItem);

        totalAmount += Number(product.price) * itemDto.quantity;
      }

      order.totalAmount = totalAmount;
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
        relations: ['user', 'items'],
      });

      if (!reloaded) {
        return savedOrder;
      }

      return reloaded;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (receiptUrl) {
        this.receiptStorage.delete(receiptUrl).catch((cleanupError) => {
          console.error('Failed to cleanup receipt after order rollback', cleanupError);
        });
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    await this.dataSource.getRepository(Order).update(id, { status });
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id },
      relations: ['user'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async updateStatusAndNotify(id: number, status: OrderStatus): Promise<Order> {
    const orderRepo = this.dataSource.getRepository(Order);
    const existing = await orderRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    await orderRepo.update(id, { status });

    const order = await orderRepo.findOne({
      where: { id },
      relations: ['user', 'items'],
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.user?.telegramId) {
      this.botService
        .notifyUserStatusChange(order.user.telegramId, order.id, status)
        .catch((error) => {
          console.error('Failed to notify user status change', error);
        });
    }

    return order;
  }

  async remove(id: number) {
    const orderRepo = this.dataSource.getRepository(Order);
    const existing = await orderRepo.findOne({
      where: { id },
      relations: ['items', 'items.product'],
    });
    if (!existing) {
      throw new NotFoundException('Order not found');
    }
    if (existing.status !== OrderStatus.CANCELLED) {
      throw new BadRequestException('Only cancelled orders can be deleted');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const item of existing.items ?? []) {
        if (!item.product) continue;
        item.product.stock += item.quantity;
        await queryRunner.manager.save(item.product);
      }

      await queryRunner.manager.delete(Order, id);
      await queryRunner.commitTransaction();

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
  ): Promise<Order> {
    const orderRepo = this.dataSource.getRepository(Order);
    const existing = await orderRepo.findOne({ where: { id: orderId } });
    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    const receiptUrl = await this.receiptStorage.save(receipt.buffer, receipt.filename);
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
}
