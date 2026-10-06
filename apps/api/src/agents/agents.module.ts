import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { ToolsModule } from '../tools/tools.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ToolsModule, AuditModule],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
