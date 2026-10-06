import { Module } from '@nestjs/common';
import { ToolsService } from './tools.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  providers: [ToolsService],
  exports: [ToolsService],
})
export class ToolsModule {}
