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

    const filters = {
      query,
      categoryIds: parsedCategoryIds,
      minPrice: hasMinPrice ? parsedMinPrice : undefined,
      maxPrice: hasMaxPrice ? parsedMaxPrice : undefined,
    };

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

  // Only Admins can create (We'll add Admin Guard later)
  @UseGuards(AuthGuard('jwt'))
  @Post()
  async create(@Req() req: FastifyRequest) {
    const parts = req.parts();
    const body: Record<string, unknown> = {};
    let imageBuffer: Buffer | undefined;

    for await (const part of parts) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        if (buffer.length > 0) {
          imageBuffer = buffer;
        }
      } else {
        body[part.fieldname] = part.value;
      }
    }

    const dto = plainToInstance(CreateProductDto, body);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return this.productsService.create(dto, imageBuffer);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    const parts = req.parts();
    const body: Record<string, unknown> = {};
    let imageBuffer: Buffer | undefined;

    for await (const part of parts) {
      if (part.type === 'file') {
        const buffer = await part.toBuffer();
        if (buffer.length > 0) {
          imageBuffer = buffer;
        }
      } else {
        body[part.fieldname] = part.value;
      }
    }

    const dto = plainToInstance(UpdateProductDto, body);
    const errors = await validate(dto, { skipMissingProperties: true });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return this.productsService.update(id, dto, imageBuffer);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.remove(id);
    return { success: true };
  }
}
