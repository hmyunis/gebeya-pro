import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { type FastifyRequest } from 'fastify';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import {
  buildPaginationMeta,
  normalizePagination,
} from '../../common/pagination';
import { MerchantsService } from './merchants.service';
import { CreateMerchantApplicationDto } from './dto/create-merchant-application.dto';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import {
  MerchantApplicationStatus,
} from './entities/merchant-application.entity';
import { ApproveMerchantApplicationDto } from './dto/approve-merchant-application.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
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

const MAX_MERCHANT_PROFILE_PICTURE_BYTES = 8 * 1024 * 1024;
const MAX_MERCHANT_MULTIPART_FIELDS = 20;

@Controller('merchants')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post('applications')
  async apply(@Req() req: FastifyRequest) {
    const { body, profilePicture } = await this.parseMultipartOrJson(req);
    const dto = plainToInstance(CreateMerchantApplicationDto, body);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return this.merchantsService.createApplication(dto, profilePicture);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  async listMerchants(
    @Query('search') search?: string,
    @Query('archive') archive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { page: safePage, limit: safeLimit } = normalizePagination(
      page,
      limit,
    );
    const parsedArchive = this.parseArchiveFilter(archive);
    const { data, total } = await this.merchantsService.listMerchants(
      safePage,
      safeLimit,
      search,
      parsedArchive,
    );
    return { data, meta: buildPaginationMeta(total, safePage, safeLimit) };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  async createMerchant(@Req() req: AuthenticatedRequest) {
    const { body, profilePicture } = await this.parseMultipartOrJson(req);
    const dto = plainToInstance(CreateMerchantDto, body);
    const errors = await validate(dto);
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }

    return this.merchantsService.createMerchant(
      dto,
      req.user.userId,
      profilePicture,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async updateMerchant(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: FastifyRequest,
  ) {
    const { body, profilePicture } = await this.parseMultipartOrJson(req);
    const dto = plainToInstance(UpdateMerchantDto, body);
    const errors = await validate(dto, { skipMissingProperties: true });
    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
    return this.merchantsService.updateMerchant(id, dto, profilePicture);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id/archive')
  setMerchantArchived(
    @Param('id', ParseIntPipe) id: number,
    @Body('archived') archived?: boolean,
  ) {
    if (typeof archived !== 'boolean') {
      throw new BadRequestException('archived boolean is required');
    }
    return this.merchantsService.setMerchantArchived(id, archived);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Delete(':id')
  deleteMerchant(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.deleteMerchant(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('applications')
  async listApplications(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedStatus = this.parseApplicationStatus(status);
    const { page: safePage, limit: safeLimit } = normalizePagination(
      page,
      limit,
    );
    const { data, total } = await this.merchantsService.listApplications(
      safePage,
      safeLimit,
      parsedStatus,
    );
    return { data, meta: buildPaginationMeta(total, safePage, safeLimit) };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('applications/pending-count')
  async pendingApplicationsCount() {
    const count = await this.merchantsService.countPendingApplications();
    return { count };
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('applications/:id')
  getApplication(@Param('id', ParseIntPipe) id: number) {
    return this.merchantsService.getApplicationById(id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('applications/:id/approve')
  approveApplication(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveMerchantApplicationDto,
  ) {
    return this.merchantsService.approveApplication(id, req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch('applications/:id/reject')
  rejectApplication(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('reviewNote') reviewNote?: string,
  ) {
    return this.merchantsService.rejectApplication(
      id,
      req.user.userId,
      reviewNote,
    );
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.MERCHANT)
  @Get('dashboard-overview')
  async merchantDashboardOverview(
    @Req() req: AuthenticatedRequest,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedDays = Number.parseInt(days ?? '', 10);
    const parsedLimit = Number.parseInt(limit ?? '', 10);
    return this.merchantsService.getDashboardOverview(
      req.user.userId,
      parsedDays,
      parsedLimit,
    );
  }

  private parseApplicationStatus(status?: string) {
    if (!status) return undefined;
    const upper = status.toUpperCase();
    if (
      !Object.values(MerchantApplicationStatus).includes(
        upper as MerchantApplicationStatus,
      )
    ) {
      throw new BadRequestException('Invalid application status');
    }
    return upper as MerchantApplicationStatus;
  }

  private parseArchiveFilter(
    archive?: string,
  ): 'active' | 'archived' | 'all' {
    const normalized = String(archive ?? 'active').toLowerCase();
    if (
      normalized !== 'active' &&
      normalized !== 'archived' &&
      normalized !== 'all'
    ) {
      throw new BadRequestException(
        'Invalid archive filter. Use active|archived|all',
      );
    }
    return normalized;
  }

  private async parseMultipartOrJson(req: FastifyRequest): Promise<{
    body: Record<string, unknown>;
    profilePicture?: Buffer;
  }> {
    const contentType = String(req.headers['content-type'] ?? '');
    if (!contentType.includes('multipart/form-data')) {
      return {
        body: ((req as any).body ?? {}) as Record<string, unknown>,
      };
    }

    const parts = (req as any).parts?.();
    if (!parts) {
      throw new BadRequestException('Invalid multipart request');
    }

    const body: Record<string, unknown> = {};
    let profilePicture: Buffer | undefined;
    let fieldCount = 0;
    let profilePictureCount = 0;

    for await (const part of parts) {
      if (part.type === 'file') {
        if (part.fieldname !== 'profilePicture') {
          throw new BadRequestException(
            `Unexpected file field "${part.fieldname}"`,
          );
        }

        profilePictureCount += 1;
        if (profilePictureCount > 1) {
          throw new BadRequestException(
            'Only one profile picture file is allowed',
          );
        }

        const buffer = await readMultipartFileToBuffer(part, {
          maxBytes: MAX_MERCHANT_PROFILE_PICTURE_BYTES,
          allowedMimePrefixes: ['image/'],
          errorLabel: 'Profile picture',
        });
        if (buffer.length > 0) {
          profilePicture = buffer;
        }
      } else {
        fieldCount += 1;
        if (fieldCount > MAX_MERCHANT_MULTIPART_FIELDS) {
          throw new BadRequestException('Too many multipart fields');
        }
        body[part.fieldname] = coerceMultipartFieldValue(
          part.value,
          part.fieldname,
        );
      }
    }

    return { body, profilePicture };
  }
}
