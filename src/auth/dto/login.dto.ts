import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginRequest {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  email: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  password: string;
}

export class LoginUserResponse {
  userId: number;
  email: string;
  nickname: string;
}

export class LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: LoginUserResponse;
  isFirstLogin: boolean;
}
