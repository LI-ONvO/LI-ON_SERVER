import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

export class VerifyEmailCodeRequest {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(6, 6)
  code: string;
}

export class VerifyEmailCodeResponse {
  email: string;
  verified: boolean;
  verificationToken: string;
}
