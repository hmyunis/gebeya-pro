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

@Injectable()
export class OrdersService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly botService: BotService,
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

  async create(userId: number, dto: CreateOrderDto): Promise<Order> {
    return this.createOrder(userId, dto);
  }

  async createForUser(userId: number, dto: CreateOrderDto): Promise<Order> {
    return this.createOrder(userId, dto);
  }

  private async createOrder(userId: number, dto: CreateOrderDto): Promise<Order> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
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
}
