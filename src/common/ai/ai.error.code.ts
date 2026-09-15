import { ErrorCode } from '../exception/error.code';

// 로드맵용 AI_SERVER_ERROR(502) / AI_SERVER_TIMEOUT(504) 는 roadmap 도메인에서 추가한다 → error-codes.md §8
export const AI_SERVER_UNAVAILABLE: ErrorCode = {
  status: 503,
  code: 'AI_SERVER_UNAVAILABLE',
  message: '추천 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.',
};
