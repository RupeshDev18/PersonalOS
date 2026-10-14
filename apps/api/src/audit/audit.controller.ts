import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CurrentUserId } from '../auth/user.decorator';
import { fileLogger } from '../common/file-logger.service';
import * as fs from 'fs';

@ApiTags('audit')
@Controller('api/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve audit trail events for the current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'taskId', required: false, type: String })
  getEvents(
    @CurrentUserId() userId: string,
    @Query('limit') limit?: number,
    @Query('taskId') taskId?: string,
  ) {
    return this.auditService.getEvents(userId, limit ? Number(limit) : 50, taskId);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Retrieve recent lines from the debug file log' })
  @ApiQuery({ name: 'lines', required: false, type: Number })
  getLogs(@Query('lines') lines?: number) {
    const logPath = fileLogger.getLogPath();
    if (!fs.existsSync(logPath)) {
      return { logPath, content: 'No log entries yet.' };
    }
    try {
      const content = fs.readFileSync(logPath, 'utf8');
      const allLines = content.split('\n');
      const count = lines ? Number(lines) : 100;
      const recent = allLines.slice(-count).join('\n');
      return { logPath, lines: count, content: recent };
    } catch (e) {
      return { logPath, error: (e as Error).message };
    }
  }
}

