import { ErrorCode } from '../common/exception/error.code';
import { ServiceException } from '../common/exception/service.exception';
import * as AuthErrorCode from './auth.error.code';

const exceptionOf =
  (errorCode: ErrorCode) =>
  (message?: string): ServiceException =>
    new ServiceException(errorCode, message);

export const InvalidEmailFormatException = exceptionOf(
  AuthErrorCode.INVALID_EMAIL_FORMAT,
);
export const InvalidPasswordFormatException = exceptionOf(
  AuthErrorCode.INVALID_PASSWORD_FORMAT,
);
export const PasswordMismatchException = exceptionOf(
  AuthErrorCode.PASSWORD_MISMATCH,
);
export const InvalidCodeException = exceptionOf(AuthErrorCode.INVALID_CODE);
export const CodeExpiredException = exceptionOf(AuthErrorCode.CODE_EXPIRED);
export const InvalidCredentialsException = exceptionOf(
  AuthErrorCode.INVALID_CREDENTIALS,
);
export const InvalidRefreshTokenException = exceptionOf(
  AuthErrorCode.INVALID_REFRESH_TOKEN,
);
export const AccountLockedException = exceptionOf(AuthErrorCode.ACCOUNT_LOCKED);
export const CodeNotFoundException = exceptionOf(AuthErrorCode.CODE_NOT_FOUND);
export const EmailAlreadyExistsException = exceptionOf(
  AuthErrorCode.EMAIL_ALREADY_EXISTS,
);
export const TooManyRequestsException = exceptionOf(
  AuthErrorCode.TOO_MANY_VERIFICATION_REQUESTS,
);
export const TooManyAttemptsException = exceptionOf(
  AuthErrorCode.TOO_MANY_VERIFICATION_ATTEMPTS,
);
