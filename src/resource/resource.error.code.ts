import { ErrorCode } from '../common/exception/error.code';

export const NO_CANDIDATE_RESOURCE: ErrorCode = {
  status: 422,
  code: 'NO_CANDIDATE_RESOURCE',
  message: '추천 가능한 자료가 없습니다.',
};
