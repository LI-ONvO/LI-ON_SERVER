import { Injectable } from '@nestjs/common';
// 런타임에 Prisma.sql 을 쓰므로 경로 별칭이 아닌 상대 경로로 가져온다(jest 가 별칭을 모른다)
import { Prisma } from '../../generated/prisma/client.js';
import { toDateString } from '../common/date';
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
import {
  KeywordSearchRequest,
  KeywordSearchResponse,
  RecommendableCertificatesResponse,
  ResolveCertificatesRequest,
  ResolveCertificatesResponse,
} from './dto/internal-lookup.dto';
import { CertificateNotFoundException } from './cert.exception';

const DEFAULT_SIZE = 20;
const DEFAULT_KEYWORD_SEARCH_SIZE = 12;
// 추천 근거로는 이 정도면 충분하고, 프롬프트 길이를 줄인다
const MAX_DESCRIPTION_LENGTH = 400;

// hist(변천과정)에 점수를 주는 건 이름이 바뀐 종목을 옛 이름으로 찾기 위해서다
// e.g. 정보처리기능사 → 프로그래밍기능사
const KEYWORD_WEIGHTS: [column: string, weight: number][] = [
  ['c.jm_nm', 100],
  ['d.mdoblig_fld_nm', 50],
  ['d.hist', 30],
  ['d.job', 10],
  ['d.summary', 3],
  ['d.career', 1],
];

type KeywordSearchRow = {
  jm_cd: string;
  jm_nm: string;
  series_nm: string | null;
  mdoblig_fld_nm: string | null;
  job: string | null;
  summary: string | null;
  career: string | null;
  hist: string | null;
  score: bigint | number;
  total: bigint | number;
};

const likePattern = (keyword: string): string =>
  `%${keyword.replace(/[\\%_]/g, '\\$&')}%`;

// Map이라 'toString' 같은 Object.prototype 키가 통과하지 않음
const SORT_COLUMNS = new Map<string, 'jm_nm' | 'jm_cd'>([
  ['name', 'jm_nm'],
  ['jmCd', 'jm_cd'],
]);

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
      qualGbCd: certification.qual_gb_cd,
      seriesNm: certification.series_nm,
      mdobligFldNm: certification.qual_detail?.mdoblig_fld_nm ?? null,
      job: certification.qual_detail?.job ?? null,
      career: certification.qual_detail?.career ?? null,
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

  async searchByKeywords(
    request: KeywordSearchRequest,
  ): Promise<KeywordSearchResponse> {
    const size = request.size ?? DEFAULT_KEYWORD_SEARCH_SIZE;
    const patterns = request.keywords.map(likePattern);

    // OR만 쓰면 '정보처리,기능사'에 도배기능사가 딸려옴
    // AND가 비었을 때만 넓힘
    let rows = await this.keywordSearch(patterns, 'AND', size);
    if (rows.length === 0 && patterns.length > 1) {
      rows = await this.keywordSearch(patterns, 'OR', size);
    }

    return {
      content: rows.map((row) => ({
        jmCd: row.jm_cd,
        name: row.jm_nm,
        seriesNm: row.series_nm,
        mdobligFldNm: row.mdoblig_fld_nm,
        job: row.job,
        summary: row.summary,
        career: row.career,
        hist: row.hist,
        score: Number(row.score),
      })),
      totalElements: Number(rows[0]?.total ?? 0),
    };
  }

  async resolve(
    request: ResolveCertificatesRequest,
  ): Promise<ResolveCertificatesResponse> {
    const size = request.size ?? DEFAULT_SIZE;

    // total은 LIMIT전 개수
    // 기능사 같은 넓은 검색어를 AI가 오해하지 않게
    const rows = await this.prismaService.$queryRaw<
      {
        jm_cd: string;
        jm_nm: string;
        qual_gb_cd: string;
        total: bigint | number;
      }[]
    >(Prisma.sql`
      SELECT jm_cd, jm_nm, qual_gb_cd, COUNT(*) OVER () AS total
      FROM certification
      WHERE jm_cd = ${request.query} OR jm_nm LIKE ${likePattern(request.query)}
      ORDER BY jm_nm = ${request.query} DESC, jm_nm, jm_cd
      LIMIT ${size}
    `);

    return {
      content: rows.map((row) => ({
        jmCd: row.jm_cd,
        name: row.jm_nm,
        qualGbCd: row.qual_gb_cd,
      })),
      totalElements: Number(rows[0]?.total ?? 0),
    };
  }

  // 페이지를 나누지 않는다
  async getRecommendable(): Promise<RecommendableCertificatesResponse> {
    const rows = await this.prismaService.qualDetail.findMany({
      where: { certification: { qual_gb_cd: 'T' } },
      select: {
        mdoblig_fld_nm: true,
        certification: {
          select: { jm_cd: true, jm_nm: true, series_nm: true },
        },
      },
      orderBy: [{ mdoblig_fld_nm: 'asc' }, { certification: { jm_nm: 'asc' } }],
    });

    return {
      content: rows.map((row) => ({
        jmCd: row.certification.jm_cd,
        name: row.certification.jm_nm,
        seriesNm: row.certification.series_nm,
        mdobligFldNm: row.mdoblig_fld_nm,
      })),
      totalElements: rows.length,
    };
  }

  private keywordSearch(
    patterns: string[],
    operator: 'AND' | 'OR',
    size: number,
  ): Promise<KeywordSearchRow[]> {
    const score = Prisma.join(
      patterns.flatMap((pattern) =>
        KEYWORD_WEIGHTS.map(
          ([column, weight]) =>
            Prisma.sql`(CASE WHEN ${Prisma.raw(column)} LIKE ${pattern} THEN ${weight} ELSE 0 END)`,
        ),
      ),
      ' + ',
    );

    const matches = patterns.map(
      (pattern) =>
        Prisma.sql`(${Prisma.join(
          KEYWORD_WEIGHTS.map(
            ([column]) => Prisma.sql`${Prisma.raw(column)} LIKE ${pattern}`,
          ),
          ' OR ',
        )})`,
    );

    return this.prismaService.$queryRaw<KeywordSearchRow[]>(Prisma.sql`
      SELECT c.jm_cd, c.jm_nm, c.series_nm, d.mdoblig_fld_nm,
             LEFT(d.job, ${MAX_DESCRIPTION_LENGTH}) AS job,
             LEFT(d.summary, ${MAX_DESCRIPTION_LENGTH}) AS summary,
             LEFT(d.career, ${MAX_DESCRIPTION_LENGTH}) AS career,
             LEFT(d.hist, ${MAX_DESCRIPTION_LENGTH}) AS hist,
             ${score} AS score,
             COUNT(*) OVER () AS total
      FROM qual_detail d
      JOIN certification c ON c.jm_cd = d.jm_cd
      WHERE ${Prisma.join(matches, ` ${operator} `)}
      ORDER BY score DESC, c.jm_nm, c.jm_cd
      LIMIT ${size}
    `);
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
