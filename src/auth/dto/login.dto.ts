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
