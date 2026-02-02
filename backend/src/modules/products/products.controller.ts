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

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query) {
      return [];
    }

    return this.productsService.search(query);
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
        imageBuffer = await part.toBuffer();
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
        imageBuffer = await part.toBuffer();
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
