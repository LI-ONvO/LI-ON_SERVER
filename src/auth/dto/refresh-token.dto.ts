import { IsJWT, IsNotEmpty } from 'class-validator';

export class RefreshTokenRequest {
  @IsNotEmpty()
  @IsJWT()
  refreshToken: string;
}

export class RefreshTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
