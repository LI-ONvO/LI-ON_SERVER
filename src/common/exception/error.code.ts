export interface ErrorCode {
  readonly status: number;
  readonly message: string;
}

// 도메인별 에러코드는 각 도메인 폴더에 <도메인>.error.code.ts 로 작성
// Define domain error codes in <domain>/<domain>.error.code.ts
// e.g. export const USER_NOT_FOUND: ErrorCode = { status: 404, message: 'User Not Found' };

// 아래는 도메인 공통 에러코드
// Common error codes below.
export const ENTITY_NOT_FOUND: ErrorCode = {
  status: 404,
  message: 'Entity Not Found',
};
