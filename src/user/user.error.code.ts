import { ErrorCode } from '../common/exception/error.code';

export const USER_NOT_FOUND: ErrorCode = {
  status: 404,
  code: 'USER_NOT_FOUND',
  message: '존재하지 않는 이름입니다.',
};
