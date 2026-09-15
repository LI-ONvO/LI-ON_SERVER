import { Injectable } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import { ValidationErrorException } from '../common/exception/service.exception';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  CertificateDetailResponse,
  ExamScheduleResponse,
} from './dto/certificate-detail.dto';
import {
  SearchCertificatesRequest,
  SearchCertificatesResponse,
} from './dto/search-certificates.dto';
import { CertificateNotFoundException } from './cert.exception';

const DEFAULT_SIZE = 20;

// Map 이라 'toString' 같은 Object.prototype 키가 통과하지 않음
const SORT_COLUMNS = new Map<string, 'jm_nm' | 'jm_cd'>([
  ['name', 'jm_nm'],
  ['jmCd', 'jm_cd'],
]);

const toDateString = (value: Date | null): string | null =>
  value === null ? null : value.toISOString().slice(0, 10);

@Injectable()
export class CertService {
  constructor(private readonly prismaService: PrismaService) {}

  async search(
    request: SearchCertificatesRequest,
  ): Promise<SearchCertificatesResponse> {
    const page = request.page ?? 0;
    const size = request.size ?? DEFAULT_SIZE;

    const where: Prisma.CertificationWhereInput = {
      ...(request.keyword ? { jm_nm: { contains: request.keyword } } : {}),
      ...(request.fieldId
        ? { fields: { some: { field_id: request.fieldId } } }
        : {}),
    };

    const [rows, totalElements] = await this.prismaService.$transaction([
      this.prismaService.certification.findMany({
        where,
        orderBy: this.orderBy(request.sort),
        skip: page * size,
        take: size,
      }),
      this.prismaService.certification.count({ where }),
    ]);

    return {
      content: rows.map((row) => ({
        jmCd: row.jm_cd,
        name: row.jm_nm,
        category: row.series_nm,
      })),
      page,
      totalElements,
      totalPages: Math.ceil(totalElements / size),
    };
  }

  async getDetail(jmCd: string): Promise<CertificateDetailResponse> {
    const certification = await this.prismaService.certification.findUnique({
      where: { jm_cd: jmCd },
      include: {
        qual_detail: true,
        exam_schedules: {
          orderBy: [{ impl_yy: 'asc' }, { impl_seq: 'asc' }],
        },
      },
    });

    if (!certification) {
      throw CertificateNotFoundException();
    }

    return {
      jmCd: certification.jm_cd,
      name: certification.jm_nm,
      category: certification.series_nm,
      description: certification.qual_detail?.summary ?? null,
      docPassRate: certification.doc_pass_rate,
      pracPassRate: certification.prac_pass_rate,
      docFee: certification.doc_fee,
      pracFee: certification.prac_fee,
      examSchedules: certification.exam_schedules.map(
        (schedule): ExamScheduleResponse => ({
          implYy: schedule.impl_yy,
          implSeq: schedule.impl_seq,
          docRegStartDt: toDateString(schedule.doc_reg_start_dt),
          docRegEndDt: toDateString(schedule.doc_reg_end_dt),
          docExamStartDt: toDateString(schedule.doc_exam_start_dt),
          docExamEndDt: toDateString(schedule.doc_exam_end_dt),
          docPassDt: toDateString(schedule.doc_pass_dt),
          pracRegStartDt: toDateString(schedule.prac_reg_start_dt),
          pracRegEndDt: toDateString(schedule.prac_reg_end_dt),
          pracExamStartDt: toDateString(schedule.prac_exam_start_dt),
          pracExamEndDt: toDateString(schedule.prac_exam_end_dt),
          pracPassDt: toDateString(schedule.prac_pass_dt),
        }),
      ),
    };
  }

  // private orderBy(sort?: string): Prisma.CertificationOrderByWithRelationInput {

  private orderBy(
    sort?: string,
  ):
    | Prisma.CertificationOrderByWithRelationInput
    | Prisma.CertificationOrderByWithRelationInput[] {
    // 페이지네이션이 흔들리지 않게 기본 정렬을 고정 **존중(존나 중요함)**
    if (!sort) {
      return { jm_cd: 'asc' };
    }

    const parts = sort.split(',').map((part) => part.trim());
    const column = SORT_COLUMNS.get(parts[0]);
    const direction = parts[1] ?? 'asc';

    if (
      parts.length > 2 ||
      column === undefined ||
      (direction !== 'asc' && direction !== 'desc')
    ) {
      throw ValidationErrorException(
        `정렬 기준은 name, jmCd 만 허용됩니다: ${sort}`,
      );
    }

    return column === 'jm_cd'
      ? { jm_cd: direction }
      : [{ [column]: direction }, { jm_cd: 'asc' }];
    // return { [column]: direction };
  }
}
