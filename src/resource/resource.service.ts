import { Injectable } from '@nestjs/common';
import { Prisma, Resource } from 'generated/prisma/client';
import { CertificateNotFoundException } from '../cert/cert.exception';
import { toIsoSeconds } from '../common/date';
import {
  EntityNotFoundException,
  ValidationErrorException,
} from '../common/exception/service.exception';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CreateResourceRequest,
  ListResourcesRequest,
  ListResourcesResponse,
  ResourceDetailResponse,
  ResourceResponse,
  UpdateResourceRequest,
  UpdateResourceResponse,
} from './dto/resource.dto';

const DEFAULT_SIZE = 20;

const toResourceResponse = (resource: Resource): ResourceResponse => ({
  id: resource.id,
  title: resource.title,
  url: resource.url,
  memo: resource.memo,
  sessionId: resource.session_id,
  jmCd: resource.jm_cd,
  createdAt: toIsoSeconds(resource.created_at),
});

@Injectable()
export class ResourceService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    userId: number,
    request: CreateResourceRequest,
  ): Promise<ResourceResponse> {
    if (request.sessionId !== undefined) {
      const session = await this.prismaService.chatSession.findFirst({
        where: { id: request.sessionId, user_id: userId },
        select: { id: true },
      });

      if (!session) {
        throw EntityNotFoundException();
      }
    }

    if (request.jmCd !== undefined) {
      const certification = await this.prismaService.certification.findUnique({
        where: { jm_cd: request.jmCd },
        select: { jm_cd: true },
      });

      if (!certification) {
        throw CertificateNotFoundException();
      }
    }

    const resource = await this.prismaService.resource.create({
      data: {
        user_id: userId,
        session_id: request.sessionId ?? null,
        jm_cd: request.jmCd ?? null,
        title: request.title,
        url: request.url,
        // ERD의 memo는 NOT NULL로 잘못 명시되어있음 -> 수정 필요
        // api는 NULL을 허용하는 방식이기 떄문에 그 방식으로 개발함
        memo: request.memo ?? '',
      },
    });

    return toResourceResponse(resource);
  }

  async list(
    userId: number,
    request: ListResourcesRequest,
  ): Promise<ListResourcesResponse> {
    const page = request.page ?? 0;
    const size = request.size ?? DEFAULT_SIZE;

    const where: Prisma.ResourceWhereInput = {
      user_id: userId,
      ...(request.sessionId === undefined
        ? {}
        : { session_id: request.sessionId }),
      ...(request.jmCd === undefined ? {} : { jm_cd: request.jmCd }),
      ...(request.type === undefined ? {} : { type: request.type }),
    };

    const [rows, totalElements] = await this.prismaService.$transaction([
      this.prismaService.resource.findMany({
        where,
        // id는 created_at이 같아도 순서를 지키기위해 존재
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: page * size,
        take: size,
      }),
      this.prismaService.resource.count({ where }),
    ]);

    return {
      content: rows.map(toResourceResponse),
      page,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
    };
  }

  async get(
    userId: number,
    resourceId: number,
  ): Promise<ResourceDetailResponse> {
    // user_id 조건으로 남의 자료도 404
    const resource = await this.prismaService.resource.findFirst({
      where: { id: resourceId, user_id: userId },
      include: { session: true, certification: true },
    });

    if (!resource) {
      throw EntityNotFoundException();
    }

    return {
      id: resource.id,
      title: resource.title,
      url: resource.url,
      memo: resource.memo,
      type: resource.type,
      session:
        resource.session === null
          ? null
          : { id: resource.session.id, title: resource.session.title },
      certificate:
        resource.certification === null
          ? null
          : {
              jmCd: resource.certification.jm_cd,
              name: resource.certification.jm_nm,
            },
      createdAt: toIsoSeconds(resource.created_at),
    };
  }

  async update(
    userId: number,
    resourceId: number,
    request: UpdateResourceRequest,
  ): Promise<UpdateResourceResponse> {
    // 빈 PATCH 는 Prisma에 빈 data
    // 멱등성을 위해 여기서 예외 발생
    if (request.title === undefined && request.memo === undefined) {
      throw ValidationErrorException('title 또는 memo 중 하나는 필요합니다.');
    }

    // updateMany 소유권 확인과 수정이 한 쿼리
    const { count } = await this.prismaService.resource.updateMany({
      where: { id: resourceId, user_id: userId },
      data: {
        ...(request.title === undefined ? {} : { title: request.title }),
        ...(request.memo === undefined ? {} : { memo: request.memo }),
      },
    });

    if (count === 0) {
      throw EntityNotFoundException();
    }

    const resource = await this.prismaService.resource.findFirst({
      where: { id: resourceId, user_id: userId },
      select: { id: true, title: true, memo: true },
    });

    if (!resource) {
      throw EntityNotFoundException();
    }

    return resource;
  }

  async remove(userId: number, resourceId: number): Promise<void> {
    const { count } = await this.prismaService.resource.deleteMany({
      where: { id: resourceId, user_id: userId },
    });

    if (count === 0) {
      throw EntityNotFoundException();
    }
  }
}
