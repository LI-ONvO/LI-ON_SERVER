import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendEmailCodeRequest {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  email: string;
}

export class SendEmailCodeResponse {
  email: string;
  expiresIn: number;
}
