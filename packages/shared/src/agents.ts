export enum AgentType {
  CHIEF = 'chief',
  RESEARCH = 'research',
  JOB = 'job',
  FINANCE = 'finance',
  SHOPPING = 'shopping',
  COMMUNICATION = 'communication',
  CONTENT = 'content',
  SOCIAL = 'social',
}

export enum AgentStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error',
  DISABLED = 'disabled',
}

export interface AgentDescriptor {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  capabilities: string[];
  status: AgentStatus;
  version: string;
}

export interface AgentInput {
  taskId: string;
  userId: string;
  prompt: string;
  context?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
}

export interface Intent {
  taskType: 'immediate' | 'scheduled' | 'recurring';
  primaryAgent: AgentType;
  requiredAgents: AgentType[];
  scheduleExpression?: string;
  summary: string;
  rawInput: string;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  requiresApproval?: boolean;
  approvalId?: string;
}

export interface AgentResult {
  taskId: string;
  agentType: AgentType;
  status: 'completed' | 'failed' | 'needs_approval';
  data: unknown;
  summary: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface BaseAgent {
  readonly id: string;
  readonly type: AgentType;
  readonly name: string;

  understand(input: AgentInput): Promise<Intent>;
  plan(input: AgentInput, intent: Intent): Promise<unknown>;
  execute(stepId: string, payload: unknown): Promise<StepResult>;
  summarize(result: AgentResult): Promise<string>;
}
