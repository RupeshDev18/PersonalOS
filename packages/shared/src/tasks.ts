import { AgentType } from './agents.js';

export enum TaskStatus {
  PENDING = 'pending',
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_APPROVAL = 'waiting_for_approval',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface TaskStep {
  id: string;
  taskId: string;
  agentType: AgentType;
  sequenceOrder: number;
  name: string;
  description: string;
  action: string;
  payload: Record<string, unknown>;
  status: TaskStatus;
  dependsOnStepIds?: string[];
  result?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  inputPrompt: string;
  status: TaskStatus;
  priority: TaskPriority;
  chiefIntent?: Record<string, unknown>;
  assignedAgents: AgentType[];
  steps: TaskStep[];
  finalSummary?: string;
  scheduledAt?: Date;
  recurringCron?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
