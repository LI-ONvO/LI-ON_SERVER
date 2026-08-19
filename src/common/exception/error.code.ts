export interface ErrorCode {
  readonly status: number;
  readonly code: string;
  readonly message: string;
}

// 도메인별 에러코드는 각 도메인 폴더에 <도메인>.error.code.ts 로 작성
// e.g. export const USER_NOT_FOUND: ErrorCode = { status: 404, code: 'USER_NOT_FOUND', message: 'User Not Found' };

// 아래는 도메인 공통 에러코드
export const ENTITY_NOT_FOUND: ErrorCode = {
  status: 404,
  code: 'NOT_FOUND',
  message: '리소스를 찾을 수 없습니다.',
};

export const UNAUTHORIZED: ErrorCode = {
  status: 401,
  code: 'UNAUTHORIZED',
  message: '인증이 필요합니다.',
};

export const VALIDATION_ERROR: ErrorCode = {
  status: 422,
  code: 'VALIDATION_ERROR',
  message: '필수 값이 누락되었거나 형식이 올바르지 않습니다.',
};
