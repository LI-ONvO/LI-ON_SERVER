import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../common/ai/ai.module';
import { ChatService } from './chat.service';
import { RoadmapController } from './roadmap.controller';
import { RoadmapService } from './roadmap.service';

@Module({
  imports: [AuthModule, AiModule],
  controllers: [RoadmapController],
  providers: [ChatService, RoadmapService],
})
export class RoadmapModule {}
