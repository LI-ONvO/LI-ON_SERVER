import { ErrorCode } from '../common/exception/error.code';

export const INVALID_EMAIL_FORMAT: ErrorCode = {
  status: 400,
  code: 'INVALID_EMAIL_FORMAT',
  message: '이메일 형식이 올바르지 않습니다.',
};

export const INVALID_PASSWORD_FORMAT: ErrorCode = {
  status: 400,
  code: 'INVALID_PASSWORD_FORMAT',
  message: '비밀번호 형식이 올바르지 않습니다.',
};

export const PASSWORD_MISMATCH: ErrorCode = {
  status: 400,
  code: 'PASSWORD_MISMATCH',
  message: '비밀번호와 비밀번호 확인이 일치하지 않습니다.',
};

export const INVALID_CODE: ErrorCode = {
  status: 400,
  code: 'INVALID_CODE',
  message: '인증 코드가 올바르지 않습니다.',
};

export const CODE_EXPIRED: ErrorCode = {
  status: 400,
  code: 'CODE_EXPIRED',
  message: '인증 코드 유효 시간이 만료되었습니다.',
};

export const INVALID_CREDENTIALS: ErrorCode = {
  status: 401,
  code: 'INVALID_CREDENTIALS',
  message: '아이디 또는 비밀번호가 올바르지 않습니다.',
};

export const INVALID_REFRESH_TOKEN: ErrorCode = {
  status: 401,
  code: 'INVALID_REFRESH_TOKEN',
  message: '유효하지 않거나 만료된 리프레시 토큰입니다.',
};

export const ACCOUNT_LOCKED: ErrorCode = {
  status: 403,
  code: 'ACCOUNT_LOCKED',
  message: '로그인 5회 실패로 계정이 잠겼습니다.',
};

export const ACCOUNT_SUSPENDED: ErrorCode = {
  status: 403,
  code: 'ACCOUNT_SUSPENDED',
  message: '정지된 계정입니다.',
};

export const CODE_NOT_FOUND: ErrorCode = {
  status: 404,
  code: 'CODE_NOT_FOUND',
  message: '발송된 인증 코드가 없거나 이미 사용되었습니다.',
};

export const EMAIL_ALREADY_EXISTS: ErrorCode = {
  status: 409,
  code: 'EMAIL_ALREADY_EXISTS',
  message: '이미 가입된 이메일입니다.',
};

export const TOO_MANY_VERIFICATION_REQUESTS: ErrorCode = {
  status: 429,
  code: 'TOO_MANY_REQUESTS',
  message: '인증 코드 재발송 요청 횟수를 초과했습니다.',
};

export const TOO_MANY_VERIFICATION_ATTEMPTS: ErrorCode = {
  status: 429,
  code: 'TOO_MANY_ATTEMPTS',
  message: '인증 코드 확인 시도 횟수를 초과했습니다.',
};
