import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Req,
  UseGuards,
  BadRequestException,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { type FastifyRequest } from 'fastify';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AuthGuard } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  buildPaginationMeta,
  normalizePagination,
} from '../../common/pagination';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import {
  coerceMultipartFieldValue,
  readMultipartFileToBuffer,
} from '../../common/multipart';

type AuthenticatedRequest = FastifyRequest & {
  user: {
    userId: number;
    role: UserRole;
  };
};

const MAX_PRODUCT_IMAGES = 5;
const MAX_PRODUCT_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_MULTIPART_FIELDS = 20;

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') query?: string,
    @Query('categoryIds') categoryIds?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
  ) {
    const { page: safePage, limit: safeLimit } = normalizePagination(
      page,
      limit,
    );
    const filters = this.parseFilterParams(query, categoryIds, minPrice, maxPrice);

    const { data, total, priceRanges } =
      await this.productsService.findFilteredPaginated(
        filters,
        safePage,
        safeLimit,
      );
    return {
      data,
      meta: {
        ...buildPaginationMeta(total, safePage, safeLimit),
        priceRanges,
      },
    };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Get('manage')
  async manageProducts(
    @Req() req: AuthenticatedRequest,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') query?: string,
    @Query('categoryIds') categoryIds?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('scope') scope?: string,
    @Query('merchantId') merchantId?: string,
  ) {
    const { page: safePage, limit: safeLimit } = normalizePagination(
      page,
      limit,
    );
    const filters = this.parseFilterParams(query, categoryIds, minPrice, maxPrice);

    const scopedFilters: ReturnType<typeof this.parseFilterParams> & {
      includeInactive: boolean;
      merchantId?: number;
      merchantIdIsNull?: boolean;
      createdById?: number;
    } = {
      ...filters,
      includeInactive: true,
    };

    if (req.user.role === UserRole.MERCHANT) {
      scopedFilters.merchantId = req.user.userId;
    } else {
      const parsedScope = this.parseManageScope(scope);
      if (parsedScope === 'mine') {
        scopedFilters.createdById = req.user.userId;
        scopedFilters.merchantIdIsNull = true;
      } else if (parsedScope === 'merchant') {
        const parsedMerchantId = Number.parseInt(merchantId ?? '', 10);
        if (!Number.isFinite(parsedMerchantId) || parsedMerchantId <= 0) {
          throw new BadRequestException(
            'merchantId is required for merchant scope',
          );
        }
        scopedFilters.merchantId = parsedMerchantId;
      }
    }

    const { data, total, priceRanges } =
      await this.productsService.findFilteredPaginated(
        scopedFilters,
        safePage,
        safeLimit,
      );
    return {
      data,
      meta: {
        ...buildPaginationMeta(total, safePage, safeLimit),
        priceRanges,
      },
    };
  }

  @Get('filters')
  async filterOptions(
    @Query('q') query?: string,
    @Query('categoryIds') categoryIds?: string,
  ) {
    const parsedCategoryIds =
      categoryIds
        ?.split(',')
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value)) ?? [];

    return this.productsService.getFilterOptions({
      query,
      categoryIds: parsedCategoryIds,
    });
  }

  @Get('search')
  async search(
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!query) {
      return { data: [], meta: buildPaginationMeta(0, 1, 10) };
    }

    const { page: safePage, limit: safeLimit } = normalizePagination(
      page,
      limit,
    );
    const { data, total, priceRanges } =
      await this.productsService.searchPaginated(query, safePage, safeLimit);
    return {
      data,
      meta: {
        ...buildPaginationMeta(total, safePage, safeLimit),
        priceRanges,
      },
    };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Post()
  async create(@Req() req: AuthenticatedRequest) {
    const body: Record<string, unknown> = {};
    const imageBuffers: Buffer[] = [];
    const contentType = String(req.headers['content-type'] ?? '');

    if (contentType.includes('multipart/form-data')) {
      const parts = req.parts();
      let fieldCount = 0;

      for await (const part of parts) {
        if (part.type === 'file') {
          if (imageBuffers.length >= MAX_PRODUCT_IMAGES) {
            throw new BadRequestException(
              `You can upload at most ${MAX_PRODUCT_IMAGES} product images`,
            );
          }

          const buffer = await readMultipartFileToBuffer(part, {
            maxBytes: MAX_PRODUCT_IMAGE_BYTES,
            allowedMimePrefixes: ['image/'],
            errorLabel: 'Product image',
          });
          if (buffer.length > 0) {
            imageBuffers.push(buffer);
          }
        } else {
          fieldCount += 1;
          if (fieldCount > MAX_MULTIPART_FIELDS) {
            throw new BadRequestException('Too many multipart fields');
          }
          body[part.fieldname] = coerceMultipartFieldValue(
            part.value,
            part.fieldname,
          );
        }
      }
    } else {
      Object.assign(body, ((req as any).body ?? {}) as Record<string, unknown>);
    }

    const dto = plainToInstance(CreateProductDto, body);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return this.productsService.create(dto, req.user, imageBuffers);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ) {
    const body: Record<string, unknown> = {};
    const imageBuffers: Buffer[] = [];
    const contentType = String(req.headers['content-type'] ?? '');

    if (contentType.includes('multipart/form-data')) {
      const parts = req.parts();
      let fieldCount = 0;

      for await (const part of parts) {
        if (part.type === 'file') {
          if (imageBuffers.length >= MAX_PRODUCT_IMAGES) {
            throw new BadRequestException(
              `You can upload at most ${MAX_PRODUCT_IMAGES} product images`,
            );
          }

          const buffer = await readMultipartFileToBuffer(part, {
            maxBytes: MAX_PRODUCT_IMAGE_BYTES,
            allowedMimePrefixes: ['image/'],
            errorLabel: 'Product image',
          });
          if (buffer.length > 0) {
            imageBuffers.push(buffer);
          }
        } else {
          fieldCount += 1;
          if (fieldCount > MAX_MULTIPART_FIELDS) {
            throw new BadRequestException('Too many multipart fields');
          }
          body[part.fieldname] = coerceMultipartFieldValue(
            part.value,
            part.fieldname,
          );
        }
      }
    } else {
      Object.assign(body, ((req as any).body ?? {}) as Record<string, unknown>);
    }

    const dto = plainToInstance(UpdateProductDto, body);
    const errors = await validate(dto, { skipMissingProperties: true });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    const retainedImageUrls = this.parseRetainedImageUrls(
      body.retainedImageUrls,
    );

    return this.productsService.update(
      id,
      dto,
      req.user,
      imageBuffers,
      retainedImageUrls,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MERCHANT)
  @Delete(':id')
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.productsService.remove(id, req.user);
    return { success: true };
  }

  private parseFilterParams(
    query?: string,
    categoryIds?: string,
    minPrice?: string,
    maxPrice?: string,
  ) {
    const parsedCategoryIds =
      categoryIds
        ?.split(',')
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((value) => Number.isFinite(value)) ?? [];

    let parsedMinPrice = Number.parseFloat(minPrice ?? '');
    let parsedMaxPrice = Number.parseFloat(maxPrice ?? '');
    const hasMinPrice = Number.isFinite(parsedMinPrice);
    const hasMaxPrice = Number.isFinite(parsedMaxPrice);

    if (hasMinPrice && hasMaxPrice && parsedMinPrice > parsedMaxPrice) {
      const temp = parsedMinPrice;
      parsedMinPrice = parsedMaxPrice;
      parsedMaxPrice = temp;
    }

    return {
      query,
      categoryIds: parsedCategoryIds,
      minPrice: hasMinPrice ? parsedMinPrice : undefined,
      maxPrice: hasMaxPrice ? parsedMaxPrice : undefined,
    };
  }

  private parseRetainedImageUrls(
    rawValue: unknown,
  ): string[] | undefined {
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return undefined;
    }

    if (typeof rawValue !== 'string') {
      throw new BadRequestException(
        'retainedImageUrls must be a JSON array of image paths',
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawValue);
    } catch {
      throw new BadRequestException(
        'retainedImageUrls must be valid JSON',
      );
    }

    if (!Array.isArray(parsed)) {
      throw new BadRequestException(
        'retainedImageUrls must be an array',
      );
    }

    const normalized = parsed
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);

    return [...new Set(normalized)];
  }

  private parseManageScope(scope?: string): 'all' | 'mine' | 'merchant' {
    const normalized = String(scope ?? 'all').trim().toLowerCase();
    if (
      normalized !== 'all' &&
      normalized !== 'mine' &&
      normalized !== 'merchant'
    ) {
      throw new BadRequestException('Invalid products manage scope');
    }
    return normalized;
  }
}
