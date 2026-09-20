import { ServiceException } from '../common/exception/service.exception';
import * as ResourceErrorCode from './resource.error.code';

export const NoCandidateResourceException = (
  message?: string,
): ServiceException =>
  new ServiceException(ResourceErrorCode.NO_CANDIDATE_RESOURCE, message);
