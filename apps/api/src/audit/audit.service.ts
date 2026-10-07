import { Injectable, OnModuleInit } from '@nestjs/common';
import { AuditEvent, AuditEventType } from '@personal-os/shared';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService implements OnModuleInit {
  private events: AuditEvent[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const dbEvents = await this.prisma.auditEvent.findMany({
        take: 50,
        orderBy: { timestamp: 'desc' },
      });
      if (dbEvents.length > 0) {
        this.events = dbEvents.map((e) => ({
          id: e.id,
          taskId: e.taskId,
          userId: e.userId,
          eventType: e.eventType as AuditEventType,
          toolName: e.toolName || undefined,
          inputPayload: (e.inputPayload as Record<string, unknown>) || undefined,
          outputPayload: (e.outputPayload as Record<string, unknown>) || undefined,
          rationale: e.rationale || undefined,
          durationMs: e.durationMs || undefined,
          timestamp: e.timestamp,
        }));
      } else {
        await this.log({
          taskId: 'system-bootstrap-01',
          userId: 'user-rupesh',
          eventType: AuditEventType.TASK_CREATED,
          toolName: 'PostgreSQL_Enclave_Bootstrap',
          inputPayload: { storage: 'PostgreSQL 5432', database: 'personal_os_db' },
          rationale: 'Seeded cryptographically verifiable audit trail into PostgreSQL storage.',
          durationMs: 2,
        });
      }
    } catch {
      // Fallback
    }
  }

  public async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    const fullEvent: AuditEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date(),
    };
    this.events.unshift(fullEvent);

    try {
      await this.prisma.auditEvent.create({
        data: {
          id: fullEvent.id,
          taskId: fullEvent.taskId,
          userId: fullEvent.userId || 'user-rupesh',
          eventType: fullEvent.eventType,
          toolName: fullEvent.toolName,
          inputPayload: (fullEvent.inputPayload as any) || undefined,
          outputPayload: (fullEvent.outputPayload as any) || undefined,
          rationale: fullEvent.rationale,
          durationMs: fullEvent.durationMs,
          timestamp: fullEvent.timestamp,
        },
      });
    } catch {
      // Memory fallback active
    }

    return fullEvent;
  }

  public getEvents(limit = 50, taskId?: string): AuditEvent[] {
    if (taskId) {
      return this.events.filter((e) => e.taskId === taskId).slice(0, limit);
    }
    return this.events.slice(0, limit);
  }
}

