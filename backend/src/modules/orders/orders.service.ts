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

  async create(userId: number, dto: CreateOrderDto): Promise<Order> {
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
        if (product.stock < itemDto.quantity) {
          throw new BadRequestException(`Not enough stock for ${product.name}`);
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

      return savedOrder;
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
}
