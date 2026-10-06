import { Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalRequest, ApprovalStatus, AuditEventType, CapabilityPermission } from '@personal-os/shared';
import { AuditService } from '../audit/audit.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ApprovalsService {
  private approvals: Map<string, ApprovalRequest> = new Map();

  constructor(private readonly auditService: AuditService) {
    // Seed one initial demo approval for visibility
    const demoId = uuidv4();
    this.approvals.set(demoId, {
      id: demoId,
      taskId: 'task-initial-1',
      stepId: 'step-apply-1',
      userId: 'default-user',
      actionType: 'jobs.application.submit',
      capabilityRequired: CapabilityPermission.JOBS_APPLICATION_SUBMIT,
      title: 'Submit Job Application to Stripe',
      description: 'Job Specialist has customized verified resume Fullstack-AWS-v3.md for Senior Full Stack Developer. Awaiting your approval to submit.',
      payload: {
        company: 'Stripe',
        role: 'Senior Full Stack Developer',
        resume: 'Fullstack-AWS-v3.md',
      },
      status: ApprovalStatus.PENDING,
      createdAt: new Date(),
    });
  }

  public createApprovalRequest(request: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'>): ApprovalRequest {
    const approval: ApprovalRequest = {
      ...request,
      id: uuidv4(),
      status: ApprovalStatus.PENDING,
      createdAt: new Date(),
    };
    this.approvals.set(approval.id, approval);

    this.auditService.log({
      taskId: approval.taskId,
      stepId: approval.stepId,
      userId: approval.userId,
      eventType: AuditEventType.APPROVAL_REQUESTED,
      toolName: approval.actionType,
      inputPayload: approval.payload,
      rationale: `Human safety gate activated: ${approval.title}`,
    });

    return approval;
  }

  public getApprovals(status?: ApprovalStatus): ApprovalRequest[] {
    const list = Array.from(this.approvals.values());
    if (status) {
      return list.filter((a) => a.status === status);
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public decide(id: string, decision: 'approve' | 'reject', note?: string): ApprovalRequest {
    const item = this.approvals.get(id);
    if (!item) {
      throw new NotFoundException(`Approval with ID '${id}' not found`);
    }

    item.status = decision === 'approve' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    item.decidedAt = new Date();
    item.userDecisionNote = note;

    this.auditService.log({
      taskId: item.taskId,
      stepId: item.stepId,
      userId: item.userId,
      eventType: decision === 'approve' ? AuditEventType.APPROVAL_GRANTED : AuditEventType.APPROVAL_REJECTED,
      toolName: item.actionType,
      outputPayload: { decision, note },
      rationale: `User manually ${decision}d action '${item.title}'`,
    });

    return item;
  }
}
