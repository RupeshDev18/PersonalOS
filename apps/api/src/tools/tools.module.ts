import { Module, forwardRef } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { AuditModule } from '../audit/audit.module';
import { ConnectorsModule } from '../connectors/connectors.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [AuditModule, ConnectorsModule, forwardRef(() => JobsModule)],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
