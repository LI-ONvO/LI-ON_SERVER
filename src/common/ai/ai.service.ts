import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../exception/error.code';
import { ServiceException } from '../exception/service.exception';

const DEFAULT_TIMEOUT_MS = 20000;

@Injectable()
export class AiService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(configService: ConfigService) {
    this.baseUrl = configService
      .getOrThrow<string>('AI_SERVER_URL')
      .replace(/\/+$/, '');
    this.apiKey = configService.getOrThrow<string>('AI_SERVER_API_KEY');
    this.timeoutMs = Number(
      configService.get<string>('AI_SERVER_TIMEOUT') ?? DEFAULT_TIMEOUT_MS,
    );
  }

  async post<T>(
    path: string,

    // 실패 매핑이 도메인마다 다라서
    body: unknown,
    onError: ErrorCode,
    onTimeout: ErrorCode = onError,
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': this.apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new ServiceException(
        error instanceof Error && error.name === 'TimeoutError'
          ? onTimeout
          : onError,
      );
    }

    if (!response.ok) {
      throw new ServiceException(onError);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new ServiceException(onError);
    }
  }
}
