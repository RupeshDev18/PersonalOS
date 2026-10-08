// ---------------------------------------------------------------------------
// Orchestration trace types.
// Defined once here so both the backend (chief.agent.ts) and the frontend
// can share the exact same shape without duplication.
// ---------------------------------------------------------------------------

export type OrchestrationPhase =
  | 'intent_parsing'
  | 'policy_check'
  | 'connector_fetch'
  | 'specialist_processing'
  | 'synthesis'
  | 'audit_seal';

export type OrchestrationStepStatus = 'completed' | 'in_progress' | 'policy_verified' | 'failed';

export interface OrchestrationStepTrace {
  id: string;
  stepNumber: number;
  phase: OrchestrationPhase;
  agent: string;
  name: string;
  description: string;
  status: OrchestrationStepStatus;
  durationMs: number;
  timestamp: string;
  details?: Record<string, unknown> | string;
}

export interface ChatRequest {
  prompt: string;
  userId: string;
}

export interface ChatResponse {
  task: unknown;
  intent: unknown;
  summary: string;
  steps: unknown[];
  details: Record<string, unknown>;
  orchestrationTrace: OrchestrationStepTrace[];
}
