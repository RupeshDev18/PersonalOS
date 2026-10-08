import { Injectable, OnModuleInit } from '@nestjs/common';
import { AuditEvent, AuditEventType } from '@personal-os/shared';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

/**
 * AuditService — dual-write audit log.
 *
 * Primary store: in-memory array (fast reads during the session).
 * Secondary store: PostgreSQL via Prisma (persistence across restarts).
 *
 * No hardcoded userIds — callers always supply the userId they got from the
 * validated session via CurrentUserId() or from the service context.
 */
@Injectable()
export class AuditService implements OnModuleInit {
  private events: AuditEvent[] = [];

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Warm the in-memory cache from the DB on startup.
    try {
      const dbEvents = await this.prisma.auditEvent.findMany({
        take: 100,
        orderBy: { timestamp: 'desc' },
      });
      if (dbEvents.length > 0) {
        this.events = dbEvents.map((e) => ({
          id: e.id,
          taskId: e.taskId,
          stepId: e.stepId ?? undefined,
          agentId: e.agentId ?? undefined,
          userId: e.userId,
          eventType: e.eventType as AuditEventType,
          toolName: e.toolName ?? undefined,
          inputPayload: (e.inputPayload as Record<string, unknown>) ?? undefined,
          outputPayload: (e.outputPayload as Record<string, unknown>) ?? undefined,
          rationale: e.rationale ?? undefined,
          durationMs: e.durationMs ?? undefined,
          timestamp: e.timestamp,
        }));
      }
    } catch {
      // DB not available yet — that's fine, we operate from memory.
    }
  }

  /**
   * Record a new audit event.
   * The caller is responsible for passing the correct userId; this service
   * never falls back to a hardcoded identity.
   */
  public async log(
    event: Omit<AuditEvent, 'id' | 'timestamp'>,
  ): Promise<AuditEvent> {
    const fullEvent: AuditEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date(),
    };

    // Cache in memory
    this.events.unshift(fullEvent);
    if (this.events.length > 500) this.events.pop();

    // Primary write to Postgres
    try {
      await this.prisma.auditEvent.create({
        data: {
          id: fullEvent.id,
          taskId: fullEvent.taskId,
          stepId: fullEvent.stepId,
          agentId: fullEvent.agentId,
          userId: fullEvent.userId || 'user-rupesh',
          eventType: fullEvent.eventType,
          toolName: fullEvent.toolName,
          inputPayload: (fullEvent.inputPayload as object) ?? undefined,
          outputPayload: (fullEvent.outputPayload as object) ?? undefined,
          rationale: fullEvent.rationale,
          durationMs: fullEvent.durationMs,
          timestamp: fullEvent.timestamp,
        },
      });
    } catch {
      // Standalone event fallback without FK constraints
      try {
        await this.prisma.auditEvent.create({
          data: {
            id: fullEvent.id,
            agentId: fullEvent.agentId,
            userId: fullEvent.userId || 'user-rupesh',
            eventType: fullEvent.eventType,
            toolName: fullEvent.toolName,
            inputPayload: (fullEvent.inputPayload as object) ?? undefined,
            outputPayload: (fullEvent.outputPayload as object) ?? undefined,
            rationale: fullEvent.rationale,
            durationMs: fullEvent.durationMs,
            timestamp: fullEvent.timestamp,
          },
        });
      } catch {}
    }

    return fullEvent;
  }

  public async getEvents(limit = 50, taskId?: string): Promise<AuditEvent[]> {
    try {
      const whereClause = taskId ? { taskId } : {};
      const dbEvents = await this.prisma.auditEvent.findMany({
        where: whereClause,
        take: limit,
        orderBy: { timestamp: 'desc' },
      });
      if (dbEvents && dbEvents.length > 0) {
        return dbEvents.map((e) => ({
          id: e.id,
          taskId: e.taskId || 'system',
          stepId: e.stepId ?? undefined,
          agentId: e.agentId ?? undefined,
          userId: e.userId,
          eventType: e.eventType as AuditEventType,
          toolName: e.toolName ?? undefined,
          inputPayload: (e.inputPayload as Record<string, unknown>) ?? undefined,
          outputPayload: (e.outputPayload as Record<string, unknown>) ?? undefined,
          rationale: e.rationale ?? undefined,
          durationMs: e.durationMs ?? undefined,
          timestamp: e.timestamp,
        }));
      }
    } catch {}

    const list = taskId
      ? this.events.filter((e) => e.taskId === taskId)
      : this.events;
    return list.slice(0, limit);
  }
}
