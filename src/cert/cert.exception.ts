import { ServiceException } from '../common/exception/service.exception';
import * as CertErrorCode from './cert.error.code';

export const CertificateNotFoundException = (
  message?: string,
): ServiceException =>
  new ServiceException(CertErrorCode.CERTIFICATE_NOT_FOUND, message);

export const RecommendationNotFoundException = (
  message?: string,
): ServiceException =>
  new ServiceException(CertErrorCode.RECOMMENDATION_NOT_FOUND, message);

export const OnboardingNotCompletedException = (
  message?: string,
): ServiceException =>
  new ServiceException(CertErrorCode.ONBOARDING_NOT_COMPLETED, message);

export const NoCandidateCertificateException = (
  message?: string,
): ServiceException =>
  new ServiceException(CertErrorCode.NO_CANDIDATE_CERTIFICATE, message);
