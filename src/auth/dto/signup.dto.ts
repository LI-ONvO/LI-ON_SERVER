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

  // 형식 검사는 AuthService 에서 수성함
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
  @MaxLength(20)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  verificationToken?: string;
}
