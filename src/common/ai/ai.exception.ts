import { ServiceException } from '../exception/service.exception';
import * as AiErrorCode from './ai.error.code';

export const AiServerUnavailableException = (
  message?: string,
): ServiceException =>
  new ServiceException(AiErrorCode.AI_SERVER_UNAVAILABLE, message);
