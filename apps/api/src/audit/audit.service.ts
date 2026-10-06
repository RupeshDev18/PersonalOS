import { Injectable } from '@nestjs/common';
import { AuditEvent, AuditEventType } from '@personal-os/shared';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuditService {
  private events: AuditEvent[] = [
    {
      id: uuidv4(),
      taskId: 'system-init',
      userId: 'default-user',
      eventType: AuditEventType.TASK_CREATED,
      toolName: 'SystemBootstrap',
      inputPayload: { status: 'INITIALIZED' },
      rationale: 'Personal AI OS security audit ledger online',
      durationMs: 1,
      timestamp: new Date(),
    },
  ];

  public log(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      id: uuidv4(),
      timestamp: new Date(),
    };
    this.events.unshift(fullEvent); // Latest first
    return fullEvent;
  }

  public getEvents(limit = 50, taskId?: string): AuditEvent[] {
    if (taskId) {
      return this.events.filter((e) => e.taskId === taskId).slice(0, limit);
    }
    return this.events.slice(0, limit);
  }
}
