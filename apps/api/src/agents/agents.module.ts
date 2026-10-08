import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { ToolsModule } from '../tools/tools.module';
import { AuditModule } from '../audit/audit.module';
import { LlmModule } from '../llm/llm.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ToolsModule, AuditModule, LlmModule, PrismaModule],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
