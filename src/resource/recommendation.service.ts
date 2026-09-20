import { Injectable } from '@nestjs/common';
import { CertificateNotFoundException } from '../cert/cert.exception';
import { AI_SERVER_UNAVAILABLE } from '../common/ai/ai.error.code';
import { AiServerUnavailableException } from '../common/ai/ai.exception';
import { AiService } from '../common/ai/ai.service';
import { toIsoSeconds } from '../common/date';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateResourceRecommendationRequest,
  CreateResourceRecommendationResponse,
  ResourceRecommendationItemResponse,
} from './dto/recommendation.dto';
import { NoCandidateResourceException } from './resource.exception';

const isItem = (
  value: unknown,
): value is ResourceRecommendationItemResponse => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const item = value as Record<string, unknown>;

  return (
    typeof item.title === 'string' &&
    item.title.trim() !== '' &&
    item.title.length <= 255 &&
    typeof item.url === 'string' &&
    item.url.trim() !== '' &&
    item.url.length <= 2048 &&
    typeof item.reason === 'string'
  );
};

@Injectable()
export class ResourceRecommendationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async create(
    userId: number,
    request: CreateResourceRecommendationRequest,
  ): Promise<CreateResourceRecommendationResponse> {
    const certification = await this.prismaService.certification.findUnique({
      where: { jm_cd: request.jmCd },
      select: { jm_cd: true, jm_nm: true },
    });

    if (!certification) {
      throw CertificateNotFoundException();
    }

    const context = await this.context(userId, request.sessionId);

    const archived = await this.prismaService.resource.findMany({
      where: { user_id: userId },
      select: { url: true },
      distinct: ['url'],
    });
    const excludeUrls = archived.map((resource) => resource.url);

    const aiResponse = await this.aiService.post<{ items?: unknown }>(
      '/resources/recommendations',
      {
        userId,
        size: request.size,
        certificate: {
          jmCd: certification.jm_cd,
          name: certification.jm_nm,
        },
        context,
        excludeUrls,
      },
      AI_SERVER_UNAVAILABLE,
    );

    if (!Array.isArray(aiResponse.items)) {
      throw AiServerUnavailableException();
    }

    // AI가 excludeUrls를 지키지 않을 수 있음
    const seen = new Set(excludeUrls);
    const items: ResourceRecommendationItemResponse[] = [];

    for (const rawItem of aiResponse.items as unknown[]) {
      if (items.length === request.size) {
        break;
      }

      if (!isItem(rawItem) || seen.has(rawItem.url)) {
        continue;
      }

      seen.add(rawItem.url);
      items.push({
        title: rawItem.title,
        url: rawItem.url,
        reason: rawItem.reason,
      });
    }

    if (items.length === 0) {
      throw NoCandidateResourceException();
    }

    return {
      jmCd: certification.jm_cd,
      generatedAt: toIsoSeconds(new Date()),
      items,
    };
  }

  private async context(
    userId: number,
    sessionId?: number,
  ): Promise<{ sessionId: number; roadmapSteps: string[] } | null> {
    if (sessionId === undefined) {
      return null;
    }

    const session = await this.prismaService.chatSession.findFirst({
      where: { id: sessionId, user_id: userId },
      include: {
        roadmaps: {
          orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
          take: 1,
          include: { steps: { orderBy: { order_no: 'asc' } } },
        },
      },
    });

    // 없는 세션도 CERTIFICATE_NOT_FOUND
    if (!session) {
      throw CertificateNotFoundException();
    }

    return {
      sessionId,
      roadmapSteps: (session.roadmaps[0]?.steps ?? []).map(
        (step) => step.title,
      ),
    };
  }
}
