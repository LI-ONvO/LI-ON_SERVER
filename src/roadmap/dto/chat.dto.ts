import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import type { ChatSender } from 'generated/prisma/client';

// Nest 기본 ParseIntPipe는 HttpException을 던져 응답 포맷이 깨짐
export class IdParam {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // 범위를 넘는 값을 Prisma까지 보내지 않기 떄문에 PK가 INT
  @Max(2147483647)
  id: number;
}

export class ListChatSessionsRequest {
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

export class CertificateRefResponse {
  jmCd: string;
  name: string;
}

export class ChatSessionSummaryResponse {
  id: number;
  title: string;
  certificate: CertificateRefResponse | null;
  createdAt: string;
  updatedAt: string;
}

export class ListChatSessionsResponse {
  content: ChatSessionSummaryResponse[];
  page: number;
  totalElements: number;
  totalPages: number;
}

export class CreateChatSessionRequest {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  jmCd?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;
}

export class CreateChatSessionResponse {
  id: number;
  title: string;
  jmCd: string | null;
  createdAt: string;
}

export class ChatMessageResponse {
  id: number;
  sender: ChatSender;
  content: string;
  createdAt: string;
}

export class ChatSessionDetailResponse {
  id: number;
  title: string;
  certificate: CertificateRefResponse | null;
  messages: ChatMessageResponse[];
}

export class SendMessageRequest {
  // TEXT(65,535 byte)에 한글(3 byte)로 꽉 채워도 들어가는 길이
  // AI 호출 뒤 저장이 실패하면 그대로 잃음
  @IsString()
  @IsNotEmpty()
  @MaxLength(20000)
  content: string;
}

export class SendMessageResponse {
  userMessage: ChatMessageResponse;
  aiMessage: ChatMessageResponse;
}
