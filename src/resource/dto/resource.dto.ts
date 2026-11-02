import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// 만료 일수 상한(10년)
export const MAX_EXPIRATION_DAYS = 3650;

export class CreateResourceRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsUrl()
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  memo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  sessionId?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  jmCd?: string;

  // 추천 항목의 expirationDate(일수). 저장 시점부터 이 일수가 지나면 자료가 삭제됨
  // 추천의 null 을 그대로 넘겨도 되도록 null 을 허용
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_EXPIRATION_DAYS)
  expirationDate?: number | null;
}

export class ResourceResponse {
  id: number;
  title: string;
  url: string;
  memo: string;
  sessionId: number | null;
  jmCd: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export class ListResourcesRequest {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  sessionId?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  jmCd?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  type?: string;

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
}

export class ListResourcesResponse {
  content: ResourceResponse[];
  page: number;
  totalElements: number;
  totalPages: number;
}

export class SessionRefResponse {
  id: number;
  title: string;
}

export class CertificateRefResponse {
  jmCd: string;
  name: string;
}

// 목록은 sessionId / jmCd 를 스칼라로, 상세는 객체로 준다. 의도된 차이다 → resource.md §3
export class ResourceDetailResponse {
  id: number;
  title: string;
  url: string;
  memo: string;
  type: string;
  session: SessionRefResponse | null;
  certificate: CertificateRefResponse | null;
  expiresAt: string | null;
  createdAt: string;
}

export class UpdateResourceRequest {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  memo?: string;
}

export class UpdateResourceResponse {
  id: number;
  title: string;
  memo: string;
}
