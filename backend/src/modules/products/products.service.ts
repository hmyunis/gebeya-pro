import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import slugify from 'slugify';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ImageService } from './image.service';

type ProductFilters = {
  query?: string;
  categoryIds?: number[];
  minPrice?: number;
  maxPrice?: number;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    private readonly imageService: ImageService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    imageBuffer?: Buffer,
  ): Promise<Product> {
    let imageUrl: string | undefined;
    if (imageBuffer) {
      imageUrl = await this.imageService.optimizeAndSave(imageBuffer);
    }

    const slug =
      slugify(createProductDto.name, { lower: true, strict: true }) +
      '-' +
      Date.now();

    const product: Product = this.productRepo.create({
      ...createProductDto,
      slug,
      imageUrl: imageUrl ?? undefined,
    });

    return this.productRepo.save(product);
  }

  findAll(): Promise<Product[]> {
    return this.productRepo.find({
      order: { createdAt: 'DESC' },
      relations: ['category'],
    });
  }

  private applyFilters(
    qb: SelectQueryBuilder<Product>,
    filters: ProductFilters,
  ) {
    const normalizedQuery = filters.query?.trim().toLowerCase() ?? '';
    if (normalizedQuery.length > 0) {
      qb.andWhere(
        '(LOWER(product.name) LIKE :q OR LOWER(COALESCE(product.description, \'\')) LIKE :q)',
        { q: `%${normalizedQuery}%` },
      );
    }

    if (filters.categoryIds && filters.categoryIds.length > 0) {
      qb.andWhere('product.categoryId IN (:...categoryIds)', {
        categoryIds: filters.categoryIds,
      });
    }

    if (typeof filters.minPrice === 'number') {
      qb.andWhere('product.price >= :minPrice', { minPrice: filters.minPrice });
    }

    if (typeof filters.maxPrice === 'number') {
      qb.andWhere('product.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }
  }

  private buildPriceRanges(minRaw: unknown, maxRaw: unknown) {
    const min = Number(minRaw);
    const max = Number(maxRaw);
    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return [];
    }

    if (min === max) {
      return [
        {
          id: 'range-1',
          min,
          max,
        },
      ];
    }

    const step = (max - min) / 5;
    return new Array(5).fill(0).map((_, idx) => {
      const start = idx === 0 ? min : min + step * idx;
      const end = idx === 4 ? max : min + step * (idx + 1);
      const roundedStart = Math.round(start);
      const roundedEnd = Math.round(end);
      return {
        id: `range-${idx + 1}`,
        min: roundedStart,
        max: roundedEnd,
      };
    });
  }

  async findFilteredPaginated(
    filters: ProductFilters,
    page: number,
    limit: number,
  ) {
    const rangeQuery = this.productRepo
      .createQueryBuilder('product')
      .leftJoin('product.category', 'category')
      .select('MIN(product.price)', 'min')
      .addSelect('MAX(product.price)', 'max');

    this.applyFilters(rangeQuery, {
      query: filters.query,
      categoryIds: filters.categoryIds,
    });

    const rangeRow = await rangeQuery.getRawOne();
    const priceRanges = this.buildPriceRanges(rangeRow?.min, rangeRow?.max);

    const query = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .orderBy('product.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    this.applyFilters(query, filters);

    const [data, total] = await query.getManyAndCount();
    return { data, total, priceRanges };
  }

  async getFilterOptions(filters: ProductFilters) {
    const rangeQuery = this.productRepo
      .createQueryBuilder('product')
      .select('MIN(product.price)', 'min')
      .addSelect('MAX(product.price)', 'max');

    this.applyFilters(rangeQuery, {
      query: filters.query,
      categoryIds: filters.categoryIds,
    });

    const [rangeRow, categories] = await Promise.all([
      rangeQuery.getRawOne(),
      this.categoryRepo
        .createQueryBuilder('category')
        .loadRelationCountAndMap('category.productCount', 'category.products')
        .orderBy('category.createdAt', 'DESC')
        .getMany(),
    ]);

    return {
      categories,
      priceRanges: this.buildPriceRanges(rangeRow?.min, rangeRow?.max),
    };
  }

  async findAllPaginated(page: number, limit: number) {
    const [data, total] = await this.productRepo.findAndCount({
      order: { createdAt: 'DESC' },
      relations: ['category'],
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepo.findOne({
      where: { id },
      relations: ['category'],
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    imageBuffer?: Buffer,
  ): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (imageBuffer) {
      if (product.imageUrl) {
        await this.imageService.deleteImage(product.imageUrl);
      }
      product.imageUrl = await this.imageService.optimizeAndSave(imageBuffer);
    }

    if (updateProductDto.name && updateProductDto.name !== product.name) {
      product.slug =
        slugify(updateProductDto.name, { lower: true, strict: true }) +
        '-' +
        Date.now();
    }

    Object.assign(product, updateProductDto);
    return this.productRepo.save(product);
  }

  async searchPaginated(query: string, page: number, limit: number) {
    return this.findFilteredPaginated({ query }, page, limit);
  }

  async remove(id: number): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.imageUrl) {
      await this.imageService.deleteImage(product.imageUrl);
    }

    await this.productRepo.remove(product);
  }
}
