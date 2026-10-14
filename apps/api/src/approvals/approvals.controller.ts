import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApprovalStatus, CapabilityPermission } from '@personal-os/shared';
import { ApprovalsService } from './approvals.service';
import { CurrentUserId } from '../auth/user.decorator';
import { IsEnum, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class DecideApprovalDto {
  @IsIn(['approve', 'reject'])
  decision: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateApprovalDto {
  @IsString()
  actionType: string;

  @IsEnum(CapabilityPermission)
  capabilityRequired: CapabilityPermission;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

@ApiTags('approvals')
@Controller('api/approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @ApiOperation({ summary: 'List safety gate approvals with optional status filter' })
  @ApiQuery({ name: 'status', required: false, enum: ApprovalStatus })
  getApprovals(
    @CurrentUserId() userId: string,
    @Query('status') status?: ApprovalStatus,
  ) {
    return this.approvalsService.getApprovals(userId, status);
  }

  @Post(':id/decide')
  @ApiOperation({ summary: 'Approve or reject a pending capability request' })
  decide(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: DecideApprovalDto,
  ) {
    return this.approvalsService.decide(id, body.decision, body.note, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new capability approval request' })
  create(
    @CurrentUserId() userId: string,
    @Body() body: CreateApprovalDto,
  ) {
    return this.approvalsService.createApprovalRequest({
      taskId: 'task-standalone',
      stepId: 'step-standalone',
      userId,
      actionType: body.actionType,
      capabilityRequired: body.capabilityRequired,
      title: body.title,
      description: body.description,
      payload: body.payload || {},
    });
  }
}
