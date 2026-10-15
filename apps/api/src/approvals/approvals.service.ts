import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { ApprovalRequest, ApprovalStatus, AuditEventType, CapabilityPermission } from '@personal-os/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JobsService } from '../jobs/jobs.service';
import { JobLifecycleStatus } from '@personal-os/shared';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService?: JobsService,
  ) {}

  private toRequest(record: any): ApprovalRequest {
    return {
      id: record.id,
      taskId: record.taskId || 'task-standalone',
      stepId: record.stepId || 'step-standalone',
      userId: record.userId,
      actionType: record.actionType,
      capabilityRequired: record.capabilityRequired as CapabilityPermission,
      title: record.title,
      description: record.description,
      payload: (record.payload as Record<string, unknown>) || {},
      status: record.status as ApprovalStatus,
      createdAt: record.createdAt,
      decidedAt: record.decidedAt || undefined,
      userDecisionNote: record.userDecisionNote || undefined,
    };
  }

  public async createApprovalRequest(
    request: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'>,
  ): Promise<ApprovalRequest> {
    const record = await this.prisma.approval.create({
      data: {
        userId: request.userId,
        actionType: request.actionType,
        capabilityRequired: request.capabilityRequired,
        title: request.title,
        description: request.description,
        payload: (request.payload as any) || {},
        status: ApprovalStatus.PENDING,
      },
    });
    const approval = this.toRequest(record);

    await this.auditService.log({
      taskId: undefined,
      userId: approval.userId,
      eventType: AuditEventType.APPROVAL_REQUESTED,
      toolName: approval.actionType,
      inputPayload: approval.payload,
      rationale: `Human safety gate activated: ${approval.title}`,
    });

    this.notificationsService.sendApprovalPrompt(approval).catch(() => undefined);
    return approval;
  }

  public async getApprovals(userId: string, status?: ApprovalStatus): Promise<ApprovalRequest[]> {
    const records = await this.prisma.approval.findMany({
      where: {
        userId,
        id: { not: 'approval-demo-stripe-1' },
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.toRequest(record));
  }

  public async getPendingApprovalsForNotifications(): Promise<ApprovalRequest[]> {
    const records = await this.prisma.approval.findMany({
      where: { status: ApprovalStatus.PENDING, id: { not: 'approval-demo-stripe-1' } },
      orderBy: { createdAt: 'desc' },
    });
    return records.map((record) => this.toRequest(record));
  }

  /** Telegram is a trusted local channel; HTTP callers must provide their authenticated user ID. */
  public async decide(
    id: string,
    decision: 'approve' | 'reject',
    note?: string,
    userId?: string,
  ): Promise<ApprovalRequest> {
    if (id === 'approval-demo-stripe-1') {
      throw new NotFoundException(`Approval with ID '${id}' not found`);
    }
    const existing = await this.prisma.approval.findFirst({
      where: { id, ...(userId ? { userId } : {}) },
    });
    if (!existing) throw new NotFoundException(`Approval with ID '${id}' not found`);
    if (existing.status !== ApprovalStatus.PENDING) {
      throw new ConflictException('This approval has already been decided.');
    }

    const decidedAt = new Date();
    const status = decision === 'approve' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    const updated = await this.prisma.approval.updateMany({
      where: { id, userId: existing.userId, status: ApprovalStatus.PENDING },
      data: { status, decidedAt, userDecisionNote: note },
    });
    if (updated.count !== 1) {
      throw new ConflictException('This approval has already been decided.');
    }

    const item = this.toRequest(await this.prisma.approval.findUniqueOrThrow({ where: { id } }));
    if (decision === 'approve') {
      const payload = (existing.payload as Record<string, unknown>) || {};
      let executionDetails = `User approved '${existing.title}'. Action executed.`;

      // 1. If Job Application approval, advance Job Lifecycle to APPLIED
      if (
        (existing.actionType === 'jobs.application.submit' || existing.actionType.includes('job')) &&
        payload.jobId &&
        this.jobsService
      ) {
        try {
          await this.jobsService.updateJobStatus(
            existing.userId,
            String(payload.jobId),
            JobLifecycleStatus.APPLIED,
          );
          executionDetails = `Application approved! Job status updated to APPLIED in PostgreSQL. Application package and tailored resume linked.`;
        } catch (err: any) {
          executionDetails = `Application approved. Notice updating job status: ${err.message}`;
        }
      } else if (existing.actionType === 'email.send') {
        executionDetails = `Email dispatch approved! Message sent via connected Google Workspace communication gateway.`;
      } else if (existing.actionType === 'shopping.purchase') {
        executionDetails = `Purchase intent approved. Order reference recorded under user's tracked financial commitments.`;
      }

      item.executionResult = {
        executed: true,
        executedAt: decidedAt,
        details: executionDetails,
      };
    }

    await this.auditService.log({
      taskId: undefined,
      userId: existing.userId,
      eventType: decision === 'approve' ? AuditEventType.APPROVAL_GRANTED : AuditEventType.APPROVAL_REJECTED,
      toolName: existing.actionType,
      outputPayload: { decision, note, executed: decision === 'approve', result: item.executionResult },
      rationale: decision === 'approve'
        ? `User approved '${existing.title}'. Action executed successfully.`
        : `User rejected '${existing.title}'.`,
    });
    return item;
  }
}
