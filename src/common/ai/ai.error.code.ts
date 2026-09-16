import { ErrorCode } from '../exception/error.code';

// 같은 AI 서버 실패해도 추천은 503
export const AI_SERVER_UNAVAILABLE: ErrorCode = {
  status: 503,
  code: 'AI_SERVER_UNAVAILABLE',
  message: '추천 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
};

// 채팅, 로드맵은 502/504
export const AI_SERVER_ERROR: ErrorCode = {
  status: 502,
  code: 'AI_SERVER_ERROR',
  message: 'AI 서버 응답 처리에 실패했습니다.',
};

export const AI_SERVER_TIMEOUT: ErrorCode = {
  status: 504,
  code: 'AI_SERVER_TIMEOUT',
  message: 'AI 서버 응답이 지연되고 있습니다.',
};
