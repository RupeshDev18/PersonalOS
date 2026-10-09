import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApprovalStatus } from '@personal-os/shared';
import { ApprovalsService } from './approvals.service';
import { CurrentUserId } from '../auth/user.decorator';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class DecideApprovalDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  note?: string;
}

@ApiTags('approvals')
@Controller('api/approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @ApiOperation({ summary: 'List safety gate approvals with optional status filter' })
  @ApiQuery({ name: 'status', required: false, enum: ApprovalStatus })
  getApprovals(
    @CurrentUserId() _userId: string,
    @Query('status') status?: ApprovalStatus,
  ) {
    return this.approvalsService.getApprovals(status);
  }

  @Post(':id/decide')
  @ApiOperation({ summary: 'Approve or reject a pending capability request' })
  decide(
    @CurrentUserId() _userId: string,
    @Param('id') id: string,
    @Body() body: DecideApprovalDto,
  ) {
    return this.approvalsService.decide(id, body.decision, body.note);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new capability approval request' })
  create(
    @CurrentUserId() userId: string,
    @Body() body: any,
  ) {
    return this.approvalsService.createApprovalRequest({
      taskId: body.taskId || 'task-manual',
      stepId: body.stepId || 'step-manual',
      userId: userId || 'user-rupesh',
      actionType: body.actionType,
      capabilityRequired: body.capabilityRequired,
      title: body.title,
      description: body.description,
      payload: body.payload || {},
    });
  }
}
