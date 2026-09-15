import { Injectable } from '@nestjs/common';
import { AI_SERVER_UNAVAILABLE } from '../common/ai/ai.error.code';
import { AiServerUnavailableException } from '../common/ai/ai.exception';
import { AiService } from '../common/ai/ai.service';
import { EntityNotFoundException } from '../common/exception/service.exception';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateRecommendationResponse,
  RecommendationResponse,
} from './dto/recommendation.dto';
import {
  NoCandidateCertificateException,
  OnboardingNotCompletedException,
  RecommendationNotFoundException,
} from './cert.exception';

type OnboardingAnswerRow = {
  question: { id: number; title: string; order_no: number };
  option: { label: string; order_no: number };
};

// 명세의 generatedAt 은 밀리초가 없다 → cert.md §3
const toIsoSeconds = (value: Date): string =>
  `${value.toISOString().slice(0, 19)}Z`;

@Injectable()
export class RecommendationService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async create(
    userId: number,
    size: number,
  ): Promise<CreateRecommendationResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        desired_fields: true,
        onboarding_answers: {
          include: { question: true, option: true },
        },
      },
    });

    if (!user) {
      throw EntityNotFoundException();
    }

    if (!user.is_onboarded) {
      throw OnboardingNotCompletedException();
    }

    const candidates = await this.prismaService.certificateField.findMany({
      where: {
        field_id: {
          in: user.desired_fields.map((desired) => desired.field_id),
        },
      },
      distinct: ['jm_cd'],
      select: { jm_cd: true },
    });

    if (candidates.length === 0) {
      throw NoCandidateCertificateException();
    }

    const aiResponse = await this.aiService.post<{ items: unknown }>(
      '/recommendations',
      {
        userId,
        size,
        user: {
          nickname: user.nickname,
          onboarding: this.toOnboardingPayload(user.onboarding_answers),
        },
      },
      AI_SERVER_UNAVAILABLE,
    );

    const rawItems: unknown = aiResponse.items;

    if (!Array.isArray(rawItems)) {
      throw AiServerUnavailableException();
    }

    // 같은 jmCd 를 두 번 주면 rank 가 중복되므로 첫 번째만 남긴다
    const reasonByJmCd = new Map<string, string>();

    for (const rawItem of rawItems as unknown[]) {

      if (typeof rawItem !== 'object' || rawItem === null) {
        continue;
      }

      const { jmCd, reason } = rawItem as { jmCd?: unknown; reason?: unknown };

      if (
        typeof jmCd === 'string' &&
        typeof reason === 'string' &&
        !reasonByJmCd.has(jmCd)
      ) {
        reasonByJmCd.set(jmCd, reason);
      }
    }

    const known = await this.prismaService.certification.findMany({
      where: { jm_cd: { in: [...reasonByJmCd.keys()] } },
      select: { jm_cd: true, jm_nm: true, series_nm: true },
    });
    const knownByJmCd = new Map(known.map((row) => [row.jm_cd, row]));

    // AI 가 준 jmCd 중 DB 에 없는 건 버린다 → cert.md §3
    const items = [...reasonByJmCd.entries()]
      .flatMap(([jmCd, reason]) => {
        const certification = knownByJmCd.get(jmCd);
        return certification ? [{ certification, reason }] : [];
      })
      .slice(0, size)
      .map(({ certification, reason }, index) => ({
        jmCd: certification.jm_cd,
        name: certification.jm_nm,
        category: certification.series_nm,
        reason,
        rankNo: index + 1,
      }));

    // 살아남은 항목이 없으면 저장할 추천이 없다. AI 응답을 실패로 본다
    if (items.length === 0) {
      throw AiServerUnavailableException();
    }

    const generatedAt = new Date();

    const recommendationId = await this.prismaService.$transaction(
      async (tx) => {
        const recommendation = await tx.recommendation.upsert({
          where: { user_id: userId },
          update: { generated_at: generatedAt },
          create: { user_id: userId, generated_at: generatedAt },
        });

        await tx.recommendationItem.deleteMany({
          where: { recommendation_id: recommendation.id },
        });
        await tx.recommendationItem.createMany({
          data: items.map((item) => ({
            recommendation_id: recommendation.id,
            jm_cd: item.jmCd,
            rank_no: item.rankNo,
            reason: item.reason,
          })),
        });

        return recommendation.id;
      },
    );

    return {
      recommendationId,
      generatedAt: toIsoSeconds(generatedAt),
      items: items.map((item) => ({
        jmCd: item.jmCd,
        name: item.name,
        category: item.category,
        reason: item.reason,
      })),
    };
  }

  async get(userId: number): Promise<RecommendationResponse> {
    const recommendation = await this.prismaService.recommendation.findUnique({
      where: { user_id: userId },
      include: {
        items: {
          orderBy: { rank_no: 'asc' },
          include: { certification: true },
        },
      },
    });

    if (!recommendation) {
      throw RecommendationNotFoundException();
    }

    return {
      recommendationId: recommendation.id,
      items: recommendation.items.map((item) => ({
        jmCd: item.jm_cd,
        name: item.certification.jm_nm,
        category: item.certification.series_nm,
        reason: item.reason,
      })),
    };
  }

  private toOnboardingPayload(
    answers: OnboardingAnswerRow[],
  ): { title: string; values: string[] }[] {
    const questions = new Map<
      number,
      {
        title: string;
        orderNo: number;
        options: OnboardingAnswerRow['option'][];
      }
    >();

    for (const answer of answers) {
      const question = questions.get(answer.question.id) ?? {
        title: answer.question.title,
        orderNo: answer.question.order_no,
        options: [],
      };

      question.options.push(answer.option);
      questions.set(answer.question.id, question);
    }

    return [...questions.values()]
      .sort((left, right) => left.orderNo - right.orderNo)
      .map((question) => ({
        title: question.title,
        values: question.options
          .sort((left, right) => left.order_no - right.order_no)
          .map((option) => option.label),
      }));
  }
}
