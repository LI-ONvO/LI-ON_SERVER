import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sign } from 'node:crypto';
import { positive } from '../common/config';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const DEFAULT_TIMEOUT_MS = 10000;

// 액세스 토큰은 1시간
// 1분 먼저 갱신한다 -> 401
const TOKEN_REFRESH_MARGIN_MS = 60000;

// FCM 페이로드
const MAX_BODY_LENGTH = 500;

export type PushMessage = {
  token: string;
  title: string;
  body: string | null;
  data: Record<string, string>;
  // 같은 키로 다시 오면 기기가 앞 알림을 덮어씀
  collapseKey: string;
};

// UNREGISTERED는 못 쓰는 토큰
// RETRY는 다음 주기에 다시 보낼 일시 오류
export type PushResult = 'SENT' | 'UNREGISTERED' | 'FAILED' | 'RETRY';

const base64url = (value: object): string =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

@Injectable()
export class FcmService {
  readonly timeoutMs: number;
  private readonly sendUrl: string;
  private readonly clientEmail: string;
  private readonly privateKey: string;
  private accessToken?: { value: string; expiresAt: number };

  constructor(configService: ConfigService) {
    const projectId = configService.getOrThrow<string>('FCM_PROJECT_ID');

    this.sendUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    this.clientEmail = configService.getOrThrow<string>('FCM_CLIENT_EMAIL');
    // .env 한 줄에 넣음 -> 줄바꿈을 \n으로 적은 키도 수용
    this.privateKey = configService
      .getOrThrow<string>('FCM_PRIVATE_KEY')
      .replace(/\\n/g, '\n');
    this.timeoutMs = positive(
      configService.get<string>('FCM_TIMEOUT'),
      DEFAULT_TIMEOUT_MS,
    );
  }

  // 액세스 토큰을 못 받으면 배치를 통째로 다음 주기로 미룸
  async send(messages: PushMessage[]): Promise<PushResult[]> {
    const accessToken = await this.getAccessToken();

    return Promise.all(
      messages.map((message) => this.sendOne(accessToken, message)),
    );
  }

  // 서비스 계정 JWT를 액세스 토큰으로 바꿈
  // firebase 의존성 제거
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now()) {
      return this.accessToken.value;
    }

    const now = Math.floor(Date.now() / 1000);
    const unsigned = `${base64url({ alg: 'RS256', typ: 'JWT' })}.${base64url({
      iss: this.clientEmail,
      scope: FCM_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })}`;
    const signature = sign(
      'sha256',
      Buffer.from(unsigned),
      this.privateKey,
    ).toString('base64url');

    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: `${unsigned}.${signature}`,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`FCM 액세스 토큰 발급 실패(${response.status})`);
    }

    const { access_token, expires_in } = (await response.json()) as {
      access_token?: unknown;
      expires_in?: unknown;
    };

    if (typeof access_token !== 'string') {
      throw new Error('FCM 액세스 토큰 응답에 access_token 이 없음');
    }

    this.accessToken = {
      value: access_token,
      expiresAt:
        Date.now() + Number(expires_in) * 1000 - TOKEN_REFRESH_MARGIN_MS,
    };

    return access_token;
  }

  private async sendOne(
    accessToken: string,
    message: PushMessage,
  ): Promise<PushResult> {
    let response: Response;

    try {
      response = await fetch(this.sendUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: message.token,
            notification: {
              title: message.title,

              // 코드 포인트 단위로 잘라야 남지 않음
              ...(message.body
                ? {
                    body: Array.from(message.body)
                      .slice(0, MAX_BODY_LENGTH)
                      .join(''),
                  }
                : {}),
            },
            data: message.data,
            android: { notification: { tag: message.collapseKey } },
            apns: {
              headers: { 'apns-collapse-id': message.collapseKey },

              // iOS 소리없이 뜨는 알림
              payload: { aps: { sound: 'default' } },
            },
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      return 'RETRY';
    }

    if (response.ok) {
      return 'SENT';
    }

    if (response.status === 404) {
      return 'UNREGISTERED';
    }

    if (response.status === 401) {
      // 캐시한 액세스 토큰이 무효가 됐을 경우
      // 다음 주기에 새로 받는다
      this.accessToken = undefined;
      return 'RETRY';
    }

    if (response.status === 429 || response.status >= 500) {
      return 'RETRY';
    }

    // 400(INVALID_ARGUMENT)/403(SENDER_ID_MISMATCH)
    return 'FAILED';
  }
}
