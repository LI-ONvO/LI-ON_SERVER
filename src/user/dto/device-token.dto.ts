import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeviceTokenRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token: string;
}
