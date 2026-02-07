import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type FastifyRequest } from 'fastify';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BankAccount, BankAccountStatus } from './entities/bank-account.entity';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { UserRole } from '../users/entities/user.entity';

type AuthenticatedRequest = FastifyRequest & {
  user: {
    userId: number;
    role: UserRole;
  };
};

@Controller('bank-accounts')
export class BankAccountsController {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankRepo: Repository<BankAccount>,
  ) {}

  @Get()
  async findActive() {
    return this.bankRepo
      .createQueryBuilder('bank')
      .where('bank.status = :status', { status: BankAccountStatus.ACTIVE })
      .orderBy('bank.createdAt', 'DESC')
      .getMany();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Get('manage')
  async findManage(@Req() req: AuthenticatedRequest) {
    return this.bankRepo.find({
      where: { ownerUserId: req.user.userId },
      order: { createdAt: 'DESC' },
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin')
  async findAdminAccounts() {
    return this.bankRepo
      .createQueryBuilder('bank')
      .where('bank.ownerUserId IS NULL')
      .orderBy('bank.createdAt', 'DESC')
      .getMany();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('admin/owner/:ownerUserId')
  async findAdminAccountsByOwner(
    @Param('ownerUserId', ParseIntPipe) ownerUserId: number,
  ) {
    return this.bankRepo.find({
      where: { ownerUserId },
      order: { createdAt: 'DESC' },
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateBankAccountDto) {
    const entity = this.bankRepo.create({
      bankName: dto.bankName,
      logoUrl: dto.logoUrl ?? null,
      accountHolderName: dto.accountHolderName,
      accountNumber: dto.accountNumber,
      status: dto.status ?? BankAccountStatus.ACTIVE,
      ownerUserId: req.user.userId,
    });
    return this.bankRepo.save(entity);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBankAccountDto,
  ) {
    const existing = await this.findScopedAccount(id, req.user);
    if (!existing) {
      throw new NotFoundException('Bank account not found');
    }
    Object.assign(existing, {
      ...dto,
      logoUrl: dto.logoUrl ?? existing.logoUrl,
    });
    return this.bankRepo.save(existing);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Delete(':id')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const existing = await this.findScopedAccount(id, req.user);
    if (!existing) {
      throw new NotFoundException('Bank account not found');
    }
    await this.bankRepo.remove(existing);
    return { success: true };
  }

  private async findScopedAccount(id: number, actor: { userId: number }) {
    const query = this.bankRepo
      .createQueryBuilder('bank')
      .where('bank.id = :id', { id });

    query.andWhere('bank.ownerUserId = :ownerUserId', {
      ownerUserId: actor.userId,
    });

    return query.getOne();
  }
}
