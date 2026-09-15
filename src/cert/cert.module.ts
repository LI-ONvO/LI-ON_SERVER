import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../common/ai/ai.module';
import { CertController } from './cert.controller';
import { CertService } from './cert.service';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [AuthModule, AiModule],
  controllers: [CertController],
  providers: [CertService, RecommendationService],
})
export class CertModule {}
