export enum AuditEventType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_STARTED = 'TASK_STARTED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_FAILED = 'TASK_FAILED',

  AGENT_ASSIGNED = 'AGENT_ASSIGNED',
  AGENT_STARTED = 'AGENT_STARTED',
  AGENT_COMPLETED = 'AGENT_COMPLETED',

  TOOL_CALLED = 'TOOL_CALLED',
  TOOL_COMPLETED = 'TOOL_COMPLETED',
  TOOL_FAILED = 'TOOL_FAILED',

  DATA_ACCESSED = 'DATA_ACCESSED',
  SEARCH_PERFORMED = 'SEARCH_PERFORMED',
  DECISION_CREATED = 'DECISION_CREATED',

  APPROVAL_REQUESTED = 'APPROVAL_REQUESTED',
  APPROVAL_GRANTED = 'APPROVAL_GRANTED',
  APPROVAL_REJECTED = 'APPROVAL_REJECTED',

  ACTION_EXECUTED = 'ACTION_EXECUTED',
  ACTION_FAILED = 'ACTION_FAILED',
}

export interface AuditEvent {
  id: string;
  taskId: string;
  stepId?: string;
  agentId?: string;
  userId: string;
  eventType: AuditEventType;
  toolName?: string;
  inputPayload?: Record<string, unknown>;
  outputPayload?: Record<string, unknown>;
  rationale?: string;
  durationMs?: number;
  timestamp: Date;
}
