import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { ChiefGraphService } from './langgraph/chief-graph.service';
import { ToolsModule } from '../tools/tools.module';
import { AuditModule } from '../audit/audit.module';
import { LlmModule } from '../llm/llm.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ToolsModule, AuditModule, LlmModule, PrismaModule],
  providers: [AgentsService, ChiefGraphService],
  exports: [AgentsService, ChiefGraphService],
})
export class AgentsModule {}
