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
  Query,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { AuthGuard } from '@nestjs/passport';
import slugify from 'slugify';
import {
  buildPaginationMeta,
  normalizePagination,
} from '../../common/pagination';

@Controller('categories')
export class CategoriesController {
  constructor(
    @InjectRepository(Category)
    private readonly catRepo: Repository<Category>,
  ) {}

  @Get()
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const {
      page: safePage,
      limit: safeLimit,
      skip,
    } = normalizePagination(page, limit);

    const query = this.catRepo
      .createQueryBuilder('category')
      .loadRelationCountAndMap('category.productCount', 'category.products')
      .orderBy('category.createdAt', 'DESC')
      .skip(skip)
      .take(safeLimit);

    const [data, total] = await query.getManyAndCount();
    return { data, meta: buildPaginationMeta(total, safePage, safeLimit) };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body('name') name: string) {
    const slug = slugify(name, { lower: true });
    const cat = this.catRepo.create({ name, slug });
    return this.catRepo.save(cat);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
  ) {
    const category = await this.catRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    category.name = name;
    category.slug = slugify(name, { lower: true });
    return this.catRepo.save(category);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const category = await this.catRepo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    await this.catRepo.remove(category);
    return { success: true };
  }
}
