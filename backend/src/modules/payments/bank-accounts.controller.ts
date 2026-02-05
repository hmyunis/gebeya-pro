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
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BankAccount, BankAccountStatus } from './entities/bank-account.entity';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Controller('bank-accounts')
export class BankAccountsController {
  constructor(
    @InjectRepository(BankAccount)
    private readonly bankRepo: Repository<BankAccount>,
  ) {}

  @Get()
  async findActive() {
    return this.bankRepo.find({
      where: { status: BankAccountStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Get('admin')
  async findAll() {
    return this.bankRepo.find({ order: { createdAt: 'DESC' } });
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Post()
  async create(@Body() dto: CreateBankAccountDto) {
    const entity = this.bankRepo.create({
      bankName: dto.bankName,
      logoUrl: dto.logoUrl ?? null,
      accountHolderName: dto.accountHolderName,
      accountNumber: dto.accountNumber,
      status: dto.status ?? BankAccountStatus.ACTIVE,
    });
    return this.bankRepo.save(entity);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBankAccountDto,
  ) {
    const existing = await this.bankRepo.findOne({ where: { id } });
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
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const existing = await this.bankRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Bank account not found');
    }
    await this.bankRepo.remove(existing);
    return { success: true };
  }
}
