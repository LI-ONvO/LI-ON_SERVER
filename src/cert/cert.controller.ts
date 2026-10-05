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
import {
  InternalKeyGuard,
  JwtOrInternalKeyGuard,
} from '../auth/internal-key.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CertService } from './cert.service';
import { CertificateDetailResponse } from './dto/certificate-detail.dto';
import {
  KeywordSearchRequest,
  KeywordSearchResponse,
  RecommendableCertificatesResponse,
  ResolveCertificatesRequest,
  ResolveCertificatesResponse,
} from './dto/internal-lookup.dto';
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

// 가드가 엔드포인트마다 달라 메서드 단위로 건다
@Controller('api')
export class CertController {
  constructor(
    private readonly certService: CertService,
    private readonly recommendationService: RecommendationService,
  ) {}

  // AI 서버 전용 3개는 /certificates/:jmCd 보다 먼저 선언해야 상세로 잡히지 않는다
  @Get('/certificates/search')
  @UseGuards(InternalKeyGuard)
  @HttpCode(HttpStatus.OK)
  async searchByKeywords(
    @Query() request: KeywordSearchRequest,
  ): Promise<KeywordSearchResponse> {
    return this.certService.searchByKeywords(request);
  }

  @Get('/certificates/resolve')
  @UseGuards(InternalKeyGuard)
  @HttpCode(HttpStatus.OK)
  async resolveCertificates(
    @Query() request: ResolveCertificatesRequest,
  ): Promise<ResolveCertificatesResponse> {
    return this.certService.resolve(request);
  }

  @Get('/certificates/recommendable')
  @UseGuards(InternalKeyGuard)
  @HttpCode(HttpStatus.OK)
  async getRecommendableCertificates(): Promise<RecommendableCertificatesResponse> {
    return this.certService.getRecommendable();
  }

  @Get('/certificates')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async searchCertificates(
    @Query() request: SearchCertificatesRequest,
  ): Promise<SearchCertificatesResponse> {
    return this.certService.search(request);
  }

  @Get('/certificates/:jmCd')
  @UseGuards(JwtOrInternalKeyGuard)
  @HttpCode(HttpStatus.OK)
  async getCertificate(
    @Param('jmCd') jmCd: string,
  ): Promise<CertificateDetailResponse> {
    return this.certService.getDetail(jmCd);
  }

  @Post('/recommendations')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createRecommendation(
    @Req() req: Request & { user: User },
    @Body() request: CreateRecommendationRequest,
  ): Promise<CreateRecommendationResponse> {
    return this.recommendationService.create(req.user.id, request.size);
  }

  @Get('/recommendations')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getRecommendation(
    @Req() req: Request & { user: User },
  ): Promise<RecommendationResponse> {
    return this.recommendationService.get(req.user.id);
  }
}
