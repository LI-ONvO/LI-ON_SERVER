import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { User } from 'generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CertService } from './cert.service';
import { CertificateDetailResponse } from './dto/certificate-detail.dto';
import {
  CreateRecommendationRequest,
  CreateRecommendationResponse,
  RecommendationResponse,
} from './dto/recommendation.dto';
import {
  SearchCertificatesRequest,
  SearchCertificatesResponse,
} from './dto/search-certificates.dto';
import { RecommendationService } from './recommendation.service';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class CertController {
  constructor(
    private readonly certService: CertService,
    private readonly recommendationService: RecommendationService,
  ) {}

  @Get('/certificates')
  @HttpCode(HttpStatus.OK)
  async searchCertificates(
    @Query() request: SearchCertificatesRequest,
  ): Promise<SearchCertificatesResponse> {
    return this.certService.search(request);
  }

  @Get('/certificates/:jmCd')
  @HttpCode(HttpStatus.OK)
  async getCertificate(
    @Param('jmCd') jmCd: string,
  ): Promise<CertificateDetailResponse> {
    return this.certService.getDetail(jmCd);
  }

  @Post('/recommendations')
  @HttpCode(HttpStatus.CREATED)
  async createRecommendation(
    @Req() req: Request & { user: User },
    @Body() request: CreateRecommendationRequest,
  ): Promise<CreateRecommendationResponse> {
    return this.recommendationService.create(req.user.id, request.size);
  }

  @Get('/recommendations')
  @HttpCode(HttpStatus.OK)
  async getRecommendation(
    @Req() req: Request & { user: User },
  ): Promise<RecommendationResponse> {
    return this.recommendationService.get(req.user.id);
  }
}
