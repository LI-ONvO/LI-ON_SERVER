import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CheckEmailRequest {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  email: string;
}

export class CheckEmailResponse {
  available: boolean;
}
