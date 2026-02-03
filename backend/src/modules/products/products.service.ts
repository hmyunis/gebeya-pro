import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import slugify from 'slugify';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ImageService } from './image.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
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
    const [data, total] = await this.productRepo.findAndCount({
      where: [
        { name: Like(`%${query}%`) },
        { description: Like(`%${query}%`) },
      ],
      relations: ['category'],
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
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
