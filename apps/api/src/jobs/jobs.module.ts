import { Module, forwardRef } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { DeduplicationService } from './deduplication.service';
import { MatchingEngineService } from './matching-engine.service';
import { ResumeCustomizerService } from './resume-customizer.service';
import { PdfCompilerService } from './pdf-compiler.service';
import { AuditModule } from '../audit/audit.module';
import { ConnectorsModule } from '../connectors/connectors.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [AuditModule, forwardRef(() => ConnectorsModule), LlmModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    DeduplicationService,
    MatchingEngineService,
    ResumeCustomizerService,
    PdfCompilerService,
  ],
  exports: [JobsService, PdfCompilerService],
})
export class JobsModule {}
