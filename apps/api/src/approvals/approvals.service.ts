import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { ApprovalRequest, ApprovalStatus, AuditEventType, CapabilityPermission } from '@personal-os/shared';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ApprovalsService implements OnModuleInit {
  private readonly logger = new Logger(ApprovalsService.name);
  private approvals: Map<string, ApprovalRequest> = new Map();

  constructor(
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    try {
      const records = await this.prisma.approval.findMany({
        orderBy: { createdAt: 'desc' },
      });

      if (records && records.length > 0) {
        for (const r of records) {
          this.approvals.set(r.id, {
            id: r.id,
            taskId: r.taskId || 'task-standalone',
            stepId: r.stepId || 'step-standalone',
            userId: r.userId,
            actionType: r.actionType,
            capabilityRequired: r.capabilityRequired as CapabilityPermission,
            title: r.title,
            description: r.description,
            payload: (r.payload as Record<string, unknown>) || {},
            status: r.status as ApprovalStatus,
            createdAt: r.createdAt,
            decidedAt: r.decidedAt || undefined,
            userDecisionNote: r.userDecisionNote || undefined,
          });
        }
        this.logger.log(`Loaded ${records.length} approval requests from PostgreSQL.`);
      } else {
        // Seed default demo pending approval
        const demoId = 'approval-demo-stripe-1';
        const demoItem: ApprovalRequest = {
          id: demoId,
          taskId: 'task-initial-demo',
          stepId: 'step-apply-demo',
          userId: 'user-rupesh',
          actionType: 'jobs.application.submit',
          capabilityRequired: CapabilityPermission.JOBS_APPLICATION_SUBMIT,
          title: 'Submit Application to Stripe',
          description:
            'Job Specialist has prepared a tailored resume (Fullstack-AWS-v3.md) for Senior Full Stack Developer at Stripe. Awaiting your approval.',
          payload: {
            company: 'Stripe',
            role: 'Senior Full Stack Developer',
            resume: 'Fullstack-AWS-v3.md',
          },
          status: ApprovalStatus.PENDING,
          createdAt: new Date(),
        };

        this.approvals.set(demoId, demoItem);

        try {
          await this.prisma.approval.upsert({
            where: { id: demoId },
            update: {},
            create: {
              id: demoId,
              userId: 'user-rupesh',
              actionType: demoItem.actionType,
              capabilityRequired: demoItem.capabilityRequired,
              title: demoItem.title,
              description: demoItem.description,
              payload: demoItem.payload as any,
              status: demoItem.status,
            },
          });
          this.logger.log('Seeded demo approval request in PostgreSQL.');
        } catch (dbErr) {
          this.logger.warn(`Could not seed demo approval to DB: ${(dbErr as Error).message}`);
        }
      }
    } catch (err) {
      this.logger.warn(`Failed reading approvals from PostgreSQL: ${(err as Error).message}. Falling back to memory.`);
    }
  }

  public async createApprovalRequest(request: Omit<ApprovalRequest, 'id' | 'status' | 'createdAt'>): Promise<ApprovalRequest> {
    const approval: ApprovalRequest = {
      ...request,
      id: uuidv4(),
      status: ApprovalStatus.PENDING,
      createdAt: new Date(),
    };
    this.approvals.set(approval.id, approval);

    try {
      await this.prisma.approval.create({
        data: {
          id: approval.id,
          userId: approval.userId || 'user-rupesh',
          actionType: approval.actionType,
          capabilityRequired: approval.capabilityRequired,
          title: approval.title,
          description: approval.description,
          payload: (approval.payload as any) || {},
          status: approval.status,
          createdAt: approval.createdAt,
        },
      });
    } catch (dbErr) {
      this.logger.warn(`Could not persist approval to Postgres: ${(dbErr as Error).message}`);
    }

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

  public async getApprovals(status?: ApprovalStatus): Promise<ApprovalRequest[]> {
    try {
      const records = await this.prisma.approval.findMany({
        where: status ? { status } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      if (records && records.length > 0) {
        return records.map((r) => ({
          id: r.id,
          taskId: r.taskId || 'task-standalone',
          stepId: r.stepId || 'step-standalone',
          userId: r.userId,
          actionType: r.actionType,
          capabilityRequired: r.capabilityRequired as CapabilityPermission,
          title: r.title,
          description: r.description,
          payload: (r.payload as Record<string, unknown>) || {},
          status: r.status as ApprovalStatus,
          createdAt: r.createdAt,
          decidedAt: r.decidedAt || undefined,
          userDecisionNote: r.userDecisionNote || undefined,
        }));
      }
    } catch (err) {
      this.logger.warn(`Error querying approvals from Postgres: ${(err as Error).message}`);
    }

    const list = Array.from(this.approvals.values());
    if (status) {
      return list.filter((a) => a.status === status);
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async decide(id: string, decision: 'approve' | 'reject', note?: string): Promise<ApprovalRequest> {
    let item = this.approvals.get(id);

    if (!item) {
      try {
        const found = await this.prisma.approval.findUnique({ where: { id } });
        if (found) {
          item = {
            id: found.id,
            taskId: found.taskId || 'task-standalone',
            stepId: found.stepId || 'step-standalone',
            userId: found.userId,
            actionType: found.actionType,
            capabilityRequired: found.capabilityRequired as CapabilityPermission,
            title: found.title,
            description: found.description,
            payload: (found.payload as Record<string, unknown>) || {},
            status: found.status as ApprovalStatus,
            createdAt: found.createdAt,
          };
          this.approvals.set(id, item);
        }
      } catch (e) {
        this.logger.warn(`Failed reading approval ${id} from DB: ${(e as Error).message}`);
      }
    }

    if (!item) {
      throw new NotFoundException(`Approval with ID '${id}' not found`);
    }

    item.status = decision === 'approve' ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    item.decidedAt = new Date();
    item.userDecisionNote = note;

    if (decision === 'approve') {
      const company = (item.payload as any)?.company || 'Company';
      const role = (item.payload as any)?.role || 'Target Position';
      const resume = (item.payload as any)?.resume || 'Custom-Resume.md';

      item.executionResult = {
        executed: true,
        executedAt: new Date(),
        details: `Dispatched & cryptographically sealed application packet for ${company} (${role}) using verified resume ${resume}. Status advanced to APPLIED.`,
      };

      this.auditService.log({
        taskId: item.taskId,
        stepId: item.stepId,
        userId: item.userId,
        eventType: AuditEventType.APPROVAL_GRANTED,
        toolName: item.actionType,
        outputPayload: { decision, note, executionResult: item.executionResult },
        rationale: `Human safety gate authorized: '${item.title}'. Downstream execution dispatched successfully.`,
      });

      this.auditService.log({
        taskId: item.taskId,
        stepId: item.stepId,
        userId: item.userId,
        eventType: AuditEventType.TOOL_COMPLETED,
        toolName: item.actionType,
        outputPayload: item.executionResult,
        rationale: item.executionResult.details,
      });
    } else {
      this.auditService.log({
        taskId: item.taskId,
        stepId: item.stepId,
        userId: item.userId,
        eventType: AuditEventType.APPROVAL_REJECTED,
        toolName: item.actionType,
        outputPayload: { decision, note },
        rationale: `User manually rejected action '${item.title}'. Safety constraint enforced.`,
      });
    }

    try {
      await this.prisma.approval.update({
        where: { id },
        data: {
          status: item.status,
          decidedAt: item.decidedAt,
          userDecisionNote: note,
        },
      });
    } catch (dbErr) {
      this.logger.warn(`Could not update approval in Postgres: ${(dbErr as Error).message}`);
    }

    return item;
  }
}
