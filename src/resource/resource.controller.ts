import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { User } from 'generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdParam } from '../roadmap/dto/chat.dto';
import {
  CreateResourceRecommendationRequest,
  CreateResourceRecommendationResponse,
} from './dto/recommendation.dto';
import {
  CreateResourceRequest,
  ListResourcesRequest,
  ListResourcesResponse,
  ResourceDetailResponse,
  ResourceResponse,
  UpdateResourceRequest,
  UpdateResourceResponse,
} from './dto/resource.dto';
import { ResourceRecommendationService } from './recommendation.service';
import { ResourceService } from './resource.service';

@Controller('api/resources')
@UseGuards(JwtAuthGuard)
export class ResourceController {
  constructor(
    private readonly resourceService: ResourceService,
    private readonly recommendationService: ResourceRecommendationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request & { user: User },
    @Body() request: CreateResourceRequest,
  ): Promise<ResourceResponse> {
    return this.resourceService.create(req.user.id, request);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @Req() req: Request & { user: User },
    @Query() request: ListResourcesRequest,
  ): Promise<ListResourcesResponse> {
    return this.resourceService.list(req.user.id, request);
  }

  // ':id' 보다 먼저 선언해야 'recommendations' 가 id 로 잡히지 않는다
  @Post('/recommendations')
  @HttpCode(HttpStatus.OK)
  async recommend(
    @Req() req: Request & { user: User },
    @Body() request: CreateResourceRecommendationRequest,
  ): Promise<CreateResourceRecommendationResponse> {
    return this.recommendationService.create(req.user.id, request);
  }

  @Get('/:id')
  @HttpCode(HttpStatus.OK)
  async get(
    @Req() req: Request & { user: User },
    @Param() { id }: IdParam,
  ): Promise<ResourceDetailResponse> {
    return this.resourceService.get(req.user.id, id);
  }

  @Patch('/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Req() req: Request & { user: User },
    @Param() { id }: IdParam,
    @Body() request: UpdateResourceRequest,
  ): Promise<UpdateResourceResponse> {
    return this.resourceService.update(req.user.id, id, request);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: Request & { user: User },
    @Param() { id }: IdParam,
  ): Promise<void> {
    return this.resourceService.remove(req.user.id, id);
  }
}
