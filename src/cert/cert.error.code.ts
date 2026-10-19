import { ErrorCode } from '../common/exception/error.code';

export const CERTIFICATE_NOT_FOUND: ErrorCode = {
  status: 404,
  code: 'CERTIFICATE_NOT_FOUND',
  message: '자격증을 찾을 수 없습니다.',
};

export const RECOMMENDATION_NOT_FOUND: ErrorCode = {
  status: 404,
  code: 'RECOMMENDATION_NOT_FOUND',
  message: '생성된 추천이 없습니다.',
};

export const ONBOARDING_NOT_COMPLETED: ErrorCode = {
  status: 409,
  code: 'ONBOARDING_NOT_COMPLETED',
  message: '온보딩을 먼저 완료해 주세요.',
};

export const CERTIFICATE_ALREADY_EXISTS: ErrorCode = {
  status: 409,
  code: 'CERTIFICATE_ALREADY_EXISTS',
  message: '이미 자격증이 존재합니다.',
};