import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoadmapRequest {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string | null;
}

export class RoadmapStepResponse {
  id: number;
  title: string;
  description: string;
  orderNo: number;
  targetDate: string | null;
}

export class RoadmapResponse {
  id: number;
  title: string;
  steps: RoadmapStepResponse[];
}

export class RoadmapSummaryResponse {
  id: number;
  title: string;
  createdAt: string;
}

export class RoadmapDetailResponse {
  id: number;
  sessionId: number;
  title: string;
  steps: RoadmapStepResponse[];
}
