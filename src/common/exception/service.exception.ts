import { ENTITY_NOT_FOUND, ErrorCode, VALIDATION_ERROR } from './error.code';

export const EntityNotFoundException = (message?: string): ServiceException => {
  return new ServiceException(ENTITY_NOT_FOUND, message);
};

export const ValidationErrorException = (message?: string): ServiceException => {
  return new ServiceException(VALIDATION_ERROR, message);
};

export class ServiceException extends Error {
  readonly errorCode: ErrorCode;

  constructor(errorCode: ErrorCode, message?: string) {
    if (!message) {
      message = errorCode.message;
    }

    super(message);

    this.errorCode = errorCode;
  }
}
