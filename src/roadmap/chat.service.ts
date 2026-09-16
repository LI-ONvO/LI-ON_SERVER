import { Injectable } from '@nestjs/common';
import { ChatMessage } from 'generated/prisma/client';
import { CertificateNotFoundException } from '../cert/cert.exception';
import { AI_SERVER_ERROR, AI_SERVER_TIMEOUT } from '../common/ai/ai.error.code';
import { AiServerErrorException } from '../common/ai/ai.exception';
import { AiService } from '../common/ai/ai.service';
import { toIsoSeconds } from '../common/date';
import { EntityNotFoundException } from '../common/exception/service.exception';
import { PrismaService } from '../common/prisma/prisma.service';
import { toOnboardingPayload } from '../user/onboarding.payload';
import {
  CertificateRefResponse,
  ChatMessageResponse,
  ChatSessionDetailResponse,
  CreateChatSessionRequest,
  CreateChatSessionResponse,
  ListChatSessionsRequest,
  ListChatSessionsResponse,
  SendMessageResponse,
} from './dto/chat.dto';

const DEFAULT_SIZE = 20;

const toCertificateRef = (
  certification: { jm_cd: string; jm_nm: string } | null,
): CertificateRefResponse | null =>
  certification === null
    ? null
    : { jmCd: certification.jm_cd, name: certification.jm_nm };

const toMessageResponse = (message: ChatMessage): ChatMessageResponse => ({
  id: message.id,
  sender: message.sender,
  content: message.content,
  createdAt: toIsoSeconds(message.created_at),
});

@Injectable()
export class ChatService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async listSessions(
    userId: number,
    request: ListChatSessionsRequest,
  ): Promise<ListChatSessionsResponse> {
    const page = request.page ?? 0;
    const size = request.size ?? DEFAULT_SIZE;
    const where = { user_id: userId };

    const [rows, totalElements] = await this.prismaService.$transaction([
      this.prismaService.chatSession.findMany({
        where,
        include: { certification: true },
        // id 는 updated_at 이 같을 때 페이지 경계가 흔들리지 않게 한다
        orderBy: [{ updated_at: 'desc' }, { id: 'desc' }],
        skip: page * size,
        take: size,
      }),
      this.prismaService.chatSession.count({ where }),
    ]);

    return {
      content: rows.map((row) => ({
        id: row.id,
        title: row.title,
        certificate: toCertificateRef(row.certification),
        createdAt: toIsoSeconds(row.created_at),
        updatedAt: toIsoSeconds(row.updated_at),
      })),
      page,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
    };
  }

  async createSession(
    userId: number,
    request: CreateChatSessionRequest,
  ): Promise<CreateChatSessionResponse> {
    if (request.jmCd) {
      const certification = await this.prismaService.certification.findUnique({
        where: { jm_cd: request.jmCd },
        select: { jm_cd: true },
      });

      if (!certification) {
        throw CertificateNotFoundException();
      }
    }

    const session = await this.prismaService.chatSession.create({
      data: {
        user_id: userId,
        jm_cd: request.jmCd ?? null,
        title: request.title,
      },
    });

    return {
      id: session.id,
      title: session.title,
      jmCd: session.jm_cd,
      createdAt: toIsoSeconds(session.created_at),
    };
  }

  async getSession(
    userId: number,
    sessionId: number,
  ): Promise<ChatSessionDetailResponse> {
    // user_id 조건으로 남의 세션도 "없음"(404)이 된다 → roadmap.md 소유권 검증
    const session = await this.prismaService.chatSession.findFirst({
      where: { id: sessionId, user_id: userId },
      include: {
        certification: true,
        messages: { orderBy: [{ created_at: 'asc' }, { id: 'asc' }] },
      },
    });

    if (!session) {
      throw EntityNotFoundException();
    }

    return {
      id: session.id,
      title: session.title,
      certificate: toCertificateRef(session.certification),
      messages: session.messages.map(toMessageResponse),
    };
  }

  async sendMessage(
    userId: number,
    sessionId: number,
    content: string,
  ): Promise<SendMessageResponse> {
    const session = await this.prismaService.chatSession.findFirst({
      where: { id: sessionId, user_id: userId },
      include: {
        certification: true,
        messages: { orderBy: [{ created_at: 'asc' }, { id: 'asc' }] },
        user: {
          include: {
            desired_fields: {
              include: { field: true },
              orderBy: { id: 'asc' },
            },
            onboarding_answers: { include: { question: true, option: true } },
          },
        },
      },
    });

    if (!session) {
      throw EntityNotFoundException();
    }

    const sentAt = new Date();

    const aiResponse = await this.aiService.post<{ content?: unknown } | null>(
      '/chat',
      {
        sessionId,
        certificate: toCertificateRef(session.certification),
        user: {
          nickname: session.user.nickname,
          desiredFields: session.user.desired_fields.map(
            (desired) => desired.field.name,
          ),
          onboarding: toOnboardingPayload(session.user.onboarding_answers),
        },
        history: session.messages.map((message) => ({
          sender: message.sender,
          content: message.content,
        })),
        content,
      },
      AI_SERVER_ERROR,
      AI_SERVER_TIMEOUT,
    );

    const reply = aiResponse?.content;

    // 빈 답변이 남는 대화를 만들지 않는다 → roadmap.md §4
    if (typeof reply !== 'string' || reply.trim() === '') {
      throw AiServerErrorException();
    }

    const repliedAt = new Date();

    const [userMessage, aiMessage] = await this.prismaService.$transaction([
      this.prismaService.chatMessage.create({
        data: {
          session_id: sessionId,
          sender: 'USER',
          content,
          created_at: sentAt,
        },
      }),
      this.prismaService.chatMessage.create({
        data: {
          session_id: sessionId,
          sender: 'AI',
          content: reply,
          created_at: repliedAt,
        },
      }),
      this.prismaService.chatSession.update({
        where: { id: sessionId },
        data: { updated_at: repliedAt },
      }),
    ]);

    return {
      userMessage: toMessageResponse(userMessage),
      aiMessage: toMessageResponse(aiMessage),
    };
  }
}
