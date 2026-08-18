export interface ErrorCode {
  readonly status: number;
  /**
   * 클라이언트가 분기에 사용하는 식별자.
   * Notion `Error Code` 레지스트리의 `enum` 값과 동일하게 맞춘다.
   */
  readonly code: string;
  readonly message: string;
}

// 도메인별 에러코드는 각 도메인 폴더에 <도메인>.error.code.ts 로 작성
// Define domain error codes in <domain>/<domain>.error.code.ts
// e.g. export const USER_NOT_FOUND: ErrorCode = { status: 404, code: 'USER_NOT_FOUND', message: 'User Not Found' };

// 아래는 도메인 공통 에러코드 (Notion Error Code 레지스트리의 GlobalErrorCode)
// Common error codes below.

/** GLB_400 */
export const INVALID_REQUEST: ErrorCode = {
  status: 400,
  code: 'INVALID_REQUEST',
  message: '잘못된 요청입니다.',
};

/** GLB_401 */
export const UNAUTHORIZED: ErrorCode = {
  status: 401,
  code: 'UNAUTHORIZED',
  message: '인증이 필요합니다.',
};

/** GLB_403 */
export const FORBIDDEN: ErrorCode = {
  status: 403,
  code: 'FORBIDDEN',
  message: '권한이 없습니다.',
};

/** GLB_404 */
export const ENTITY_NOT_FOUND: ErrorCode = {
  status: 404,
  code: 'NOT_FOUND',
  message: '리소스를 찾을 수 없습니다.',
};

/** GLB_409 */
export const CONFLICT: ErrorCode = {
  status: 409,
  code: 'CONFLICT',
  message: '요청이 충돌했습니다.',
};

/**
 * GLB_422 (레지스트리 미등록 - 등록 필요)
 * DTO 검증 실패 시 전역 ValidationPipe 가 사용한다.
 */
export const VALIDATION_ERROR: ErrorCode = {
  status: 422,
  code: 'VALIDATION_ERROR',
  message: '필수 값이 누락되었거나 형식이 올바르지 않습니다.',
};

/** GLB_500 */
export const INTERNAL_SERVER_ERROR: ErrorCode = {
  status: 500,
  code: 'INTERNAL_SERVER_ERROR',
  message: '서버 오류가 발생했습니다.',
};
