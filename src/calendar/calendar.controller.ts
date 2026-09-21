import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { User } from 'generated/prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IdParam } from '../roadmap/dto/chat.dto';
import { CalendarService } from './calendar.service';
import {
  CalendarEventResponse,
  CreateCalendarEventRequest,
  ListCalendarEventsRequest,
  UpdateCalendarEventRequest,
} from './dto/calendar-event.dto';

@Controller('api/calendar/events')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: Request & { user: User },
    @Body() request: CreateCalendarEventRequest,
  ): Promise<CalendarEventResponse> {
    return this.calendarService.create(req.user.id, request);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @Req() req: Request & { user: User },
    @Query() request: ListCalendarEventsRequest,
  ): Promise<CalendarEventResponse[]> {
    return this.calendarService.list(req.user.id, request);
  }

  @Patch('/:id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Req() req: Request & { user: User },
    @Param() { id }: IdParam,
    @Body() request: UpdateCalendarEventRequest,
  ): Promise<CalendarEventResponse> {
    return this.calendarService.update(req.user.id, id, request);
  }

  @Delete('/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Req() req: Request & { user: User },
    @Param() { id }: IdParam,
  ): Promise<void> {
    return this.calendarService.remove(req.user.id, id);
  }
}
