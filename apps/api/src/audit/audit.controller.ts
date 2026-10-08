import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CurrentUserId } from '../auth/user.decorator';

@ApiTags('audit')
@Controller('api/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve audit trail events for the current user' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'taskId', required: false, type: String })
  getEvents(
    @CurrentUserId() _userId: string,
    @Query('limit') limit?: number,
    @Query('taskId') taskId?: string,
  ) {
    // userId available here for future per-user filtering
    return this.auditService.getEvents(limit ? Number(limit) : 50, taskId);
  }
}
