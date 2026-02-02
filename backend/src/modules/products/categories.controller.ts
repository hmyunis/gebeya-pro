import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { AuthGuard } from '@nestjs/passport';
import slugify from 'slugify';

@Controller('categories')
export class CategoriesController {
  constructor(
    @InjectRepository(Category)
    private readonly catRepo: Repository<Category>,
  ) {}

  @Get()
  findAll() {
    return this.catRepo.find();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Body('name') name: string) {
    const slug = slugify(name, { lower: true });
    const cat = this.catRepo.create({ name, slug });
    return this.catRepo.save(cat);
  }
}
