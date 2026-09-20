import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../common/ai/ai.module';
import { ResourceRecommendationService } from './recommendation.service';
import { ResourceController } from './resource.controller';
import { ResourceService } from './resource.service';

@Module({
  imports: [AuthModule, AiModule],
  controllers: [ResourceController],
  providers: [ResourceService, ResourceRecommendationService],
})
export class ResourceModule {}
