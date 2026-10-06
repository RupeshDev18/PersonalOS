import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { DeduplicationService } from './deduplication.service';
import { MatchingEngineService } from './matching-engine.service';
import { ResumeCustomizerService } from './resume-customizer.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    DeduplicationService,
    MatchingEngineService,
    ResumeCustomizerService,
  ],
  exports: [JobsService],
})
export class JobsModule {}
