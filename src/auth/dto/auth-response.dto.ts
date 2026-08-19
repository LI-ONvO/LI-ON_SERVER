export class CheckEmailResponse {
  available: boolean;
}

export class SendEmailCodeResponse {
  email: string;
  expiresIn: number;
}

export class VerifyEmailCodeResponse {
  email: string;
  verified: boolean;
  verificationToken: string;
}

export class SignupResponse {
  userId: number;
  email: string;
  nickname: string;
  createdAt: string;
}

export class LoginUserResponse {
  userId: number;
  email: string;
  nickname: string;
}

export class LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';함
  expiresIn: number;
  user: LoginUserResponse;
  isFirstLogin: boolean;
}

export class RefreshTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
