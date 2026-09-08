import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { DesiredFieldResponse } from './user-profile.dto';

export class OnboardingAnswerRequest {
  @IsNotEmpty()
  @IsString()
  questionKey: string;

  // 선택 개수 검증은 min_select / max_select 로 서비스에서 한다.
  @IsArray()
  @IsString({ each: true })
  optionValues: string[];
}

export class SubmitOnboardingRequest {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OnboardingAnswerRequest)
  answers: OnboardingAnswerRequest[];
}

export class SubmitOnboardingResponse {
  desiredFields: DesiredFieldResponse[];
}
