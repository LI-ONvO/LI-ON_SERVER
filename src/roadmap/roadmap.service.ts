import { Injectable } from '@nestjs/common';
import { RoadmapStep } from 'generated/prisma/client';
import { AI_SERVER_ERROR, AI_SERVER_TIMEOUT } from '../common/ai/ai.error.code';
import { AiServerErrorException } from '../common/ai/ai.exception';
import { AiService } from '../common/ai/ai.service';
import { toDateString, toIsoSeconds } from '../common/date';
import { EntityNotFoundException } from '../common/exception/service.exception';
import { PrismaService } from '../common/prisma/prisma.service';
import { toOnboardingPayload } from '../user/onboarding.payload';
import {
  RoadmapDetailResponse,
  RoadmapResponse,
  RoadmapStepResponse,
  RoadmapSummaryResponse,
} from './dto/roadmap.dto';

type AiStep = {
  title: string;
  description: string;
  targetDate?: string | null;
};

const isTitle = (value: unknown): value is string =>
  typeof value === 'string' && value.trim() !== '' && value.length <= 255;

const isDateString = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(value);

  // Date는 2026-02-30같은 값을 다음 달로 넘겨 버림
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const isStep = (value: unknown): value is AiStep => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const step = value as Record<string, unknown>;

  return (
    isTitle(step.title) &&
    typeof step.description === 'string' &&
    (step.targetDate === undefined ||
      step.targetDate === null ||
      isDateString(step.targetDate))
  );
};

const toStepResponse = (step: RoadmapStep): RoadmapStepResponse => ({
  id: step.id,
  title: step.title,
  description: step.description,
  orderNo: step.order_no,
  targetDate: toDateString(step.target_date),
});

@Injectable()
export class RoadmapService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async create(
    userId: number,
    sessionId: number,
    title?: string | null,
  ): Promise<RoadmapResponse> {
    const session = await this.prismaService.chatSession.findFirst({
      where: { id: sessionId, user_id: userId },
      include: {
        messages: { orderBy: [{ created_at: 'asc' }, { id: 'asc' }] },
        certification: {
          include: {
            qual_detail: true,
            exam_schedules: {
              orderBy: [{ impl_yy: 'asc' }, { impl_seq: 'asc' }],
            },
          },
        },
        user: {
          include: {
            onboarding_answers: { include: { question: true, option: true } },
          },
        },
      },
    });

    if (!session) {
      throw EntityNotFoundException();
    }

    const { certification, user } = session;

    const aiResponse = await this.aiService.post<{
      title?: unknown;
      steps?: unknown;
    } | null>(
      '/roadmaps',
      {
        sessionId,
        // AI가 targetDate를 계산하는 기준
        today: new Date().toLocaleDateString('sv-SE'),
        user: {
          nickname: user.nickname,
          onboarding: toOnboardingPayload(user.onboarding_answers),
        },
        certificate:
          certification === null
            ? null
            : {
                jmCd: certification.jm_cd,
                name: certification.jm_nm,
                category: certification.series_nm,
                description: certification.qual_detail?.summary ?? null,
                // 상세 조회보다 필드가 적음
                examSchedules: certification.exam_schedules.map((schedule) => ({
                  implYy: schedule.impl_yy,
                  implSeq: schedule.impl_seq,
                  docRegStartDt: toDateString(schedule.doc_reg_start_dt),
                  docExamStartDt: toDateString(schedule.doc_exam_start_dt),
                  docPassDt: toDateString(schedule.doc_pass_dt),
                  pracRegStartDt: toDateString(schedule.prac_reg_start_dt),
                  pracExamStartDt: toDateString(schedule.prac_exam_start_dt),
                  pracPassDt: toDateString(schedule.prac_pass_dt),
                })),
              },
        messages: session.messages.map((message) => ({
          sender: message.sender,
          content: message.content,
        })),
        title: title ?? null,
      },
      AI_SERVER_ERROR,
      AI_SERVER_TIMEOUT,
    );

    // 사용자가 준 제목 검증
    const roadmapTitle = title ?? aiResponse?.title;
    const steps = aiResponse?.steps;

    if (
      !isTitle(roadmapTitle) ||
      !Array.isArray(steps) ||
      steps.length === 0 ||
      !steps.every(isStep)
    ) {
      throw AiServerErrorException();
    }

    // create는 Prisma가 한 트랜잭션으로 실행
    const roadmap = await this.prismaService.roadmap.create({
      data: {
        session_id: sessionId,
        user_id: userId,
        title: roadmapTitle,
        steps: {
          create: steps.map((step, index) => ({
            title: step.title,
            description: step.description,
            // AI의 orderNo는 검증된 데이터가 아님
            order_no: index + 1,
            target_date: step.targetDate ? new Date(step.targetDate) : null,
          })),
        },
      },
      include: { steps: { orderBy: { order_no: 'asc' } } },
    });

    return {
      id: roadmap.id,
      title: roadmap.title,
      steps: roadmap.steps.map(toStepResponse),
    };
  }

  async listBySession(
    userId: number,
    sessionId: number,
  ): Promise<RoadmapSummaryResponse[]> {
    const session = await this.prismaService.chatSession.findFirst({
      where: { id: sessionId, user_id: userId },
      include: {
        roadmaps: { orderBy: [{ created_at: 'desc' }, { id: 'desc' }] },
      },
    });

    if (!session) {
      throw EntityNotFoundException();
    }

    return session.roadmaps.map((roadmap) => ({
      id: roadmap.id,
      title: roadmap.title,
      createdAt: toIsoSeconds(roadmap.created_at),
    }));
  }

  async get(userId: number, roadmapId: number): Promise<RoadmapDetailResponse> {
    const roadmap = await this.prismaService.roadmap.findFirst({
      where: { id: roadmapId, user_id: userId },
      include: { steps: { orderBy: { order_no: 'asc' } } },
    });

    if (!roadmap) {
      throw EntityNotFoundException();
    }

    return {
      id: roadmap.id,
      sessionId: roadmap.session_id,
      title: roadmap.title,
      steps: roadmap.steps.map(toStepResponse),
    };
  }
}
