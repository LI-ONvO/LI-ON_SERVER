import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchCertificatesRequest {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  fieldId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size?: number;

  // 화이트리스트 검증은 서비스에서 한다(문자열을 그대로 orderBy 에 넘기지 않는다) → cert.md §1
  @IsOptional()
  @IsString()
  sort?: string;
}

export class CertificateSummaryResponse {
  jmCd: string;
  name: string;
  category: string | null;
}

export class SearchCertificatesResponse {
  content: CertificateSummaryResponse[];
  page: number;
  totalElements: number;
  totalPages: number;
}
