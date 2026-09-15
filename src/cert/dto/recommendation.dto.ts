import { IsInt, Max, Min } from 'class-validator';

export class CreateRecommendationRequest {
  @IsInt()
  @Min(1)
  @Max(20)
  size: number;
}

export class RecommendationItemResponse {
  jmCd: string;
  name: string;
  category: string | null;
  reason: string;
}

export class CreateRecommendationResponse {
  recommendationId: number;
  generatedAt: string;
  items: RecommendationItemResponse[];
}

// 조회 응답에는 generatedAt 이 없다. 명세 그대로다 → cert.md §5
export class RecommendationResponse {
  recommendationId: number;
  items: RecommendationItemResponse[];
}
