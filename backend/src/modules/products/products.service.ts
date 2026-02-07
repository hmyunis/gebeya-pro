import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import slugify from 'slugify';
import { Product } from './entities/product.entity';
import { Category } from './entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ImageService } from './image.service';
import { User, UserRole } from '../users/entities/user.entity';
import {
  BankAccount,
  BankAccountStatus,
} from '../payments/entities/bank-account.entity';

type ProductFilters = {
  query?: string;
  categoryIds?: number[];
  minPrice?: number;
  maxPrice?: number;
  merchantId?: number | null;
  merchantIdIsNull?: boolean;
  createdById?: number;
  includeInactive?: boolean;
};

type StaffActor = {
  userId: number;
  role: UserRole;
};

const MAX_PRODUCT_IMAGES = 5;

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(BankAccount)
    private readonly bankAccountRepo: Repository<BankAccount>,
    private readonly imageService: ImageService,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    actor: StaffActor,
    imageBuffers: Buffer[] = [],
  ): Promise<Product> {
    if (imageBuffers.length > MAX_PRODUCT_IMAGES) {
      throw new BadRequestException(
        `You can upload at most ${MAX_PRODUCT_IMAGES} product images`,
      );
    }
    const imageUrls =
      imageBuffers.length > 0
        ? await this.imageService.optimizeAndSaveMany(imageBuffers)
        : [];

    const slug =
      slugify(createProductDto.name, { lower: true, strict: true }) +
      '-' +
      Date.now();

    const assignment = await this.resolveOwnershipAndBankAssignment(
      actor,
      createProductDto.merchantId,
      createProductDto.bankAccountId,
    );

    const {
      merchantId: _requestedMerchantId,
      bankAccountId: _requestedBankAccountId,
      ...nextPayload
    } = createProductDto;

    const product: Product = this.productRepo.create({
      ...nextPayload,
      slug,
      imageUrl: imageUrls[0] ?? undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : null,
      createdById: actor.userId,
      merchantId: assignment.merchantId,
      bankAccountId: assignment.bankAccountId,
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
    if (!filters.includeInactive) {
      qb.andWhere('product.isActive = :isActive', { isActive: true });
    }

    const normalizedQuery = filters.query?.trim().toLowerCase() ?? '';
    if (normalizedQuery.length > 0) {
      qb.andWhere(
        "(LOWER(product.name) LIKE :q OR LOWER(COALESCE(product.description, '')) LIKE :q)",
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

    if (typeof filters.merchantId === 'number') {
      qb.andWhere('product.merchantId = :merchantId', {
        merchantId: filters.merchantId,
      });
    } else if (filters.merchantIdIsNull) {
      qb.andWhere('product.merchantId IS NULL');
    }

    if (typeof filters.createdById === 'number') {
      qb.andWhere('product.createdById = :createdById', {
        createdById: filters.createdById,
      });
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
      merchantId: filters.merchantId,
      merchantIdIsNull: filters.merchantIdIsNull,
      createdById: filters.createdById,
      includeInactive: filters.includeInactive,
    });

    const rangeRow = await rangeQuery.getRawOne();
    const priceRanges = this.buildPriceRanges(rangeRow?.min, rangeRow?.max);

    const query = this.productRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.createdBy', 'createdBy')
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
      merchantId: filters.merchantId,
      merchantIdIsNull: filters.merchantIdIsNull,
      createdById: filters.createdById,
      includeInactive: filters.includeInactive,
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
    return this.findFilteredPaginated({}, page, limit);
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
    actor: StaffActor,
    imageBuffers: Buffer[] = [],
    retainedImageUrls?: string[],
  ): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    this.assertCanManageProduct(product, actor);

    if (imageBuffers.length > MAX_PRODUCT_IMAGES) {
      throw new BadRequestException(
        `You can upload at most ${MAX_PRODUCT_IMAGES} product images`,
      );
    }

    if (imageBuffers.length > 0 || retainedImageUrls !== undefined) {
      const existingImagePaths = this.getProductImagePaths(product);

      const baseRetainedImages =
        retainedImageUrls !== undefined
          ? this.sanitizeRetainedImageUrls(retainedImageUrls, existingImagePaths)
          : imageBuffers.length > 0
            ? []
            : existingImagePaths;

      if (baseRetainedImages.length + imageBuffers.length > MAX_PRODUCT_IMAGES) {
        throw new BadRequestException(
          `You can upload at most ${MAX_PRODUCT_IMAGES} product images`,
        );
      }

      const savedImageUrls =
        imageBuffers.length > 0
          ? await this.imageService.optimizeAndSaveMany(imageBuffers)
          : [];
      const nextImageUrls = [...baseRetainedImages, ...savedImageUrls];

      const removedImagePaths = existingImagePaths.filter(
        (path) => !nextImageUrls.includes(path),
      );
      if (removedImagePaths.length > 0) {
        await this.imageService.deleteImages(removedImagePaths);
      }

      product.imageUrls = nextImageUrls.length > 0 ? nextImageUrls : null;
      product.imageUrl = nextImageUrls[0] ?? undefined;
    }

    if (updateProductDto.name && updateProductDto.name !== product.name) {
      product.slug =
        slugify(updateProductDto.name, { lower: true, strict: true }) +
        '-' +
        Date.now();
    }

    const requestedMerchantId = updateProductDto.merchantId;
    const requestedBankAccountId = updateProductDto.bankAccountId;
    const nextMerchantId =
      actor.role === UserRole.ADMIN
        ? requestedMerchantId !== undefined
          ? requestedMerchantId
          : product.merchantId
        : actor.userId;
    const ownerIsChanging =
      actor.role === UserRole.ADMIN &&
      requestedMerchantId !== undefined &&
      requestedMerchantId !== product.merchantId;
    const nextBankAccountId =
      requestedBankAccountId !== undefined
        ? requestedBankAccountId
        : ownerIsChanging
          ? null
          : product.bankAccountId;

    const assignment = await this.resolveOwnershipAndBankAssignment(
      actor,
      nextMerchantId,
      nextBankAccountId,
    );

    const {
      merchantId: _requestedMerchantId,
      bankAccountId: _requestedBankAccountId,
      ...nextPayload
    } = updateProductDto;

    Object.assign(product, nextPayload, {
      merchantId: assignment.merchantId,
      bankAccountId: assignment.bankAccountId,
    });
    return this.productRepo.save(product);
  }

  async searchPaginated(
    query: string,
    page: number,
    limit: number,
    merchantId?: number | null,
  ) {
    return this.findFilteredPaginated({ query, merchantId }, page, limit);
  }

  async remove(id: number, actor: StaffActor): Promise<void> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    this.assertCanManageProduct(product, actor);

    const imagePaths = this.getProductImagePaths(product);
    if (imagePaths.length > 0) {
      await this.imageService.deleteImages(imagePaths);
    }

    await this.productRepo.remove(product);
  }

  private getProductImagePaths(product: Product) {
    const paths = [
      ...(Array.isArray(product.imageUrls) ? product.imageUrls : []),
      product.imageUrl,
    ];
    return [...new Set(paths.filter((path): path is string => Boolean(path)))];
  }

  private sanitizeRetainedImageUrls(
    retainedImageUrls: string[],
    existingImagePaths: string[],
  ) {
    const normalized = retainedImageUrls
      .map((path) => path.trim())
      .filter((path) => path.length > 0);
    const unique = [...new Set(normalized)];

    const invalidPaths = unique.filter((path) => !existingImagePaths.includes(path));
    if (invalidPaths.length > 0) {
      throw new BadRequestException(
        'One or more retained product images are invalid',
      );
    }

    return unique;
  }

  private async resolveOwnershipAndBankAssignment(
    actor: StaffActor,
    merchantIdRaw: number | null | undefined,
    bankAccountIdRaw: number | null | undefined,
  ) {
    const merchantId =
      actor.role === UserRole.MERCHANT
        ? actor.userId
        : this.normalizeOptionalId(merchantIdRaw, 'merchantId');

    if (merchantId !== null) {
      const merchant = await this.userRepo.findOne({
        where: { id: merchantId, role: UserRole.MERCHANT },
        select: { id: true },
      });
      if (!merchant) {
        throw new BadRequestException('Selected merchant is invalid');
      }
    }

    const bankAccountId = this.normalizeOptionalId(
      bankAccountIdRaw,
      'bankAccountId',
    );
    if (bankAccountId !== null) {
      const ownerUserId = merchantId ?? actor.userId;
      const bankAccount = await this.bankAccountRepo.findOne({
        where: { id: bankAccountId },
      });
      if (!bankAccount) {
        throw new BadRequestException('Selected bank account does not exist');
      }
      if (bankAccount.ownerUserId !== ownerUserId) {
        throw new BadRequestException(
          'Selected bank account does not belong to the product owner',
        );
      }
      if (bankAccount.status !== BankAccountStatus.ACTIVE) {
        throw new BadRequestException('Selected bank account must be active');
      }
    }

    return { merchantId, bankAccountId };
  }

  private normalizeOptionalId(
    value: number | null | undefined,
    fieldName: string,
  ): number | null {
    if (value === undefined || value === null) return null;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${fieldName} must be a positive integer`);
    }
    return parsed;
  }

  private assertCanManageProduct(product: Product, actor: StaffActor) {
    if (actor.role === UserRole.ADMIN) {
      return;
    }
    if (actor.role === UserRole.MERCHANT && product.merchantId === actor.userId) {
      return;
    }
    throw new BadRequestException('You can only manage your own products');
  }
}
