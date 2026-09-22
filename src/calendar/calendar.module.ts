import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AlarmWorker } from './alarm.worker';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { FcmService } from './fcm.service';

@Module({
  imports: [AuthModule],
  controllers: [CalendarController],
  providers: [CalendarService, AlarmWorker, FcmService],
})
export class CalendarModule {}
