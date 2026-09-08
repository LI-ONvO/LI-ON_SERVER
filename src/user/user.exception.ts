import { ServiceException } from '../common/exception/service.exception';
import * as UserErrorCode from './user.error.code';

export const UserNotFoundException = (message?: string): ServiceException =>
  new ServiceException(UserErrorCode.USER_NOT_FOUND, message);
