import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { AuditModule } from '../audit/audit.module';
import { ConnectorsModule } from '../connectors/connectors.module';

@Module({
  imports: [AuditModule, ConnectorsModule],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
