import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

// AI 서버 전용 조회
export class KeywordSearchRequest {

  // 쉼표(,)로 구분되어 들어온 문자열을 배열로 변환
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? [
          ...new Set(
            value
              .split(',')
              .map((keyword) => keyword.trim())
              .filter(Boolean),
          ),
        ]
      : value,
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  keywords: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size?: number;
}

export class KeywordSearchItemResponse {
  jmCd: string;
  name: string;
  seriesNm: string | null;
  mdobligFldNm: string | null;
  job: string | null;
  summary: string | null;
  career: string | null;
  hist: string | null;
  score: number;
}

export class KeywordSearchResponse {
  content: KeywordSearchItemResponse[];
  totalElements: number;
}

export class ResolveCertificatesRequest {
  @IsString()
  @IsNotEmpty()
  query: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number;
}

export class ResolveCertificatesResponse {
  content: { jmCd: string; name: string; qualGbCd: string }[];
  totalElements: number;
}

export class RecommendableCertificatesResponse {
  content: {
    jmCd: string;
    name: string;
    seriesNm: string | null;
    mdobligFldNm: string | null;
  }[];
  totalElements: number;
}
