import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateResourceRecommendationRequest {
  @IsString()
  @IsNotEmpty()
  jmCd: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  sessionId?: number;

  @IsInt()
  @Min(1)
  @Max(20)
  size: number;
}

export class ResourceRecommendationItemResponse {
  title: string;
  url: string;
  reason: string;
}

// 추천 결과는 `/api/resources`로 저장
export class CreateResourceRecommendationResponse {
  jmCd: string;
  generatedAt: string;
  items: ResourceRecommendationItemResponse[];
}
