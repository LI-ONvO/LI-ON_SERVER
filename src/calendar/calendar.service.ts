import { Injectable } from '@nestjs/common';
import { Alarm, CalendarEvent } from 'generated/prisma/client';
import { toIsoSeconds } from '../common/date';
import {
  EntityNotFoundException,
  ValidationErrorException,
} from '../common/exception/service.exception';
import { PrismaService } from '../common/prisma/prisma.service';
import {
  AlarmRequest,
  CalendarEventResponse,
  CreateCalendarEventRequest,
  ListCalendarEventsRequest,
  UpdateCalendarEventRequest,
} from './dto/calendar-event.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

const ALARM_ORDER = [{ remind_at: 'asc' as const }, { id: 'asc' as const }];

// '20260801'같은 형식은 Date가 파싱 못함
const toDate = (field: string, value: string): Date => {
  const date = new Date(value);

  if (isNaN(date.getTime())) {
    throw ValidationErrorException(`${field} 형식이 올바르지 않습니다.`);
  }

  return date;
};

const toRemindAts = (alarms: AlarmRequest[]): Date[] => {
  const remindAts = alarms.map((alarm) => toDate('remindAt', alarm.remindAt));
  const now = new Date();

  if (remindAts.some((remindAt) => remindAt < now)) {
    throw ValidationErrorException('remindAt 은 과거 시각일 수 없습니다.');
  }

  return remindAts;
};

const assertRange = (startAt: Date, endAt: Date | null): void => {
  if (endAt !== null && endAt < startAt) {
    throw ValidationErrorException('endAt 은 startAt 이후여야 합니다.');
  }
};

const toEventResponse = (
  event: CalendarEvent & { alarms: Alarm[] },
): CalendarEventResponse => ({
  id: event.id,
  title: event.title,
  description: event.description,
  startAt: toIsoSeconds(event.start_at),
  endAt: event.end_at === null ? null : toIsoSeconds(event.end_at),
  roadmapStepId: event.roadmap_step_id,
  alarms: event.alarms.map((alarm) => ({
    id: alarm.id,
    remindAt: toIsoSeconds(alarm.remind_at),
  })),
});

@Injectable()
export class CalendarService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    userId: number,
    request: CreateCalendarEventRequest,
  ): Promise<CalendarEventResponse> {
    const startAt = toDate('startAt', request.startAt);
    const endAt =
      request.endAt === undefined || request.endAt === null
        ? null
        : toDate('endAt', request.endAt);

    assertRange(startAt, endAt);

    const remindAts = toRemindAts(request.alarms ?? []);

    if (request.roadmapStepId !== undefined) {
      // 내 로드맵의 스텝이 아니면 404
      const step = await this.prismaService.roadmapStep.findFirst({
        where: { id: request.roadmapStepId, roadmap: { user_id: userId } },
        select: { id: true },
      });

      if (!step) {
        throw EntityNotFoundException();
      }
    }

    // 중첩 create는 Prisma가 한 트랜잭션으로 실행
    const event = await this.prismaService.calendarEvent.create({
      data: {
        user_id: userId,
        roadmap_step_id: request.roadmapStepId ?? null,
        title: request.title,
        description: request.description ?? null,
        start_at: startAt,
        end_at: endAt,
        alarms: { create: remindAts.map((remind_at) => ({ remind_at })) },
      },
      include: { alarms: { orderBy: ALARM_ORDER } },
    });

    return toEventResponse(event);
  }

  async list(
    userId: number,
    request: ListCalendarEventsRequest,
  ): Promise<CalendarEventResponse[]> {
    const from = new Date(`${request.from}T00:00:00.000Z`);
    const toExclusive = new Date(
      new Date(`${request.to}T00:00:00.000Z`).getTime() + DAY_MS,
    );

    const events = await this.prismaService.calendarEvent.findMany({
      where: {
        user_id: userId,
        start_at: { lt: toExclusive },
        OR: [
          { end_at: { gte: from } },
          { end_at: null, start_at: { gte: from } },
        ],
      },
      orderBy: [{ start_at: 'asc' }, { id: 'asc' }],
      include: { alarms: { orderBy: ALARM_ORDER } },
    });

    return events.map(toEventResponse);
  }

  async update(
    userId: number,
    eventId: number,
    request: UpdateCalendarEventRequest,
  ): Promise<CalendarEventResponse> {
    const startAt =
      request.startAt === undefined
        ? undefined
        : toDate('startAt', request.startAt);
    const endAt =
      request.endAt === undefined
        ? undefined
        : request.endAt === null
          ? null
          : toDate('endAt', request.endAt);

    const remindAts =
      request.alarms === undefined ? null : toRemindAts(request.alarms);

    return this.prismaService.$transaction(async (tx) => {
      // endAt < startAt 조합이 저장될 수 있음
      const [current] = await tx.$queryRaw<
        Pick<CalendarEvent, 'start_at' | 'end_at'>[]
      >`SELECT start_at, end_at FROM calendar_event WHERE id = ${eventId} AND user_id = ${userId} FOR UPDATE`;

      if (!current) {
        throw EntityNotFoundException();
      }

      assertRange(
        startAt ?? current.start_at,
        endAt === undefined ? current.end_at : endAt,
      );

      await tx.calendarEvent.update({
        where: { id: eventId },
        data: {
          ...(request.title === undefined ? {} : { title: request.title }),
          ...(request.description === undefined
            ? {}
            : { description: request.description }),
          ...(startAt === undefined ? {} : { start_at: startAt }),
          ...(endAt === undefined ? {} : { end_at: endAt }),
        },
      });

      // 필드가 없으면 기존 알림 유지
      // [] 면 전량 삭제
      // 값이 있으면 교체
      if (remindAts !== null) {
        // SENT/FAILED는 발송 이력
        // 삭제 하면 안됨
        await tx.alarm.deleteMany({
          where: { event_id: eventId, status: 'PENDING' },
        });

        if (remindAts.length > 0) {
          await tx.alarm.createMany({
            data: remindAts.map((remind_at) => ({
              event_id: eventId,
              remind_at,
            })),
          });
        }
      }

      const event = await tx.calendarEvent.findFirst({
        where: { id: eventId, user_id: userId },
        include: { alarms: { orderBy: ALARM_ORDER } },
      });

      if (!event) {
        throw EntityNotFoundException();
      }

      return toEventResponse(event);
    });
  }

  async remove(userId: number, eventId: number): Promise<void> {
    // 알림도 삭제된다
    // event_id 종속
    const { count } = await this.prismaService.calendarEvent.deleteMany({
      where: { id: eventId, user_id: userId },
    });

    if (count === 0) {
      throw EntityNotFoundException();
    }
  }
}
