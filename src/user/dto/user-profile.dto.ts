import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DesiredFieldResponse {
  id: number;
  name: string;
}

export class MyProfileResponse {
  id: number;
  email: string;
  nickname: string;
  isOnboarded: boolean;
  desiredFields: DesiredFieldResponse[];
}

export class UpdateProfileRequest {
  @IsNotEmpty()
  @IsString()
  @MaxLength(10)
  nickname: string;
}

export class UpdateProfileResponse {
  id: number;
  nickname: string;
}
