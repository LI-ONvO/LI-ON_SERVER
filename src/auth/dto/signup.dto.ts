import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

export class SignupRequest {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  passwordConfirm: string;

  @IsNotEmpty()
  @IsString()
  @Length(2, 10)
  nickname: string;

  @IsOptional()
  @IsString()
  verificationToken?: string;
}

export class SignupResponse {
  userId: number;
  email: string;
  nickname: string;
  createdAt: string;
}
