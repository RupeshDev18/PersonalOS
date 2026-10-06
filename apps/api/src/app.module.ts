import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ToolsModule } from './tools/tools.module';
import { AgentsModule } from './agents/agents.module';
import { TasksModule } from './tasks/tasks.module';
import { JobsModule } from './jobs/jobs.module';
import { FinanceModule } from './finance/finance.module';
import { ShoppingModule } from './shopping/shopping.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { LlmModule } from './llm/llm.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    AuditModule,
    ApprovalsModule,
    ToolsModule,
    AgentsModule,
    TasksModule,
    JobsModule,
    FinanceModule,
    ShoppingModule,
    ConnectorsModule,
    LlmModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
