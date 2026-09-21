import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// strict 가 없으면 2026-02-30 을 통과시키고 Date 는 그걸 3월로 넘긴다
const ISO = { strict: true, strictSeparator: true };

export class AlarmRequest {
  @IsISO8601(ISO)
  remindAt: string;
}

export class AlarmResponse {
  id: number;
  remindAt: string;
}

export class CalendarEventResponse {
  id: number;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  roadmapStepId: number | null;
  alarms: AlarmResponse[];
}

export class CreateCalendarEventRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string | null;

  @IsISO8601(ISO)
  startAt: string;

  @IsOptional()
  @IsISO8601(ISO)
  endAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  roadmapStepId?: number;

  // IsOptional 은 null 도 건너뛴다. alarms 는 null 을 거절해야 해서 ValidateIf 를 쓴다
  @ValidateIf(
    (request: CreateCalendarEventRequest) => request.alarms !== undefined,
  )
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => AlarmRequest)
  alarms?: AlarmRequest[];
}

// roadmapStepId 는 수정 대상이 아니다
export class UpdateCalendarEventRequest {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string | null;

  @IsOptional()
  @IsISO8601(ISO)
  startAt?: string;

  @IsOptional()
  @IsISO8601(ISO)
  endAt?: string | null;정

  @ValidateIf(
    (request: UpdateCalendarEventRequest) => request.alarms !== undefined,
  )
  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => AlarmRequest)
  alarms?: AlarmRequest[];
}

export class ListCalendarEventsRequest {
  // 페이지네이션이 없어 범위가 필수다. IsISO8601 만으로는 날짜시각도 통과한다
  @IsISO8601(ISO)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'from 은 YYYY-MM-DD 여야 합니다.',
  })
  from: string;

  @IsISO8601(ISO)
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to 은 YYYY-MM-DD 여야 합니다.' })
  to: string;
}
