// ---------------------------------------------------------------------------
// Frontend-only type definitions.
// These are the shapes the frontend works with — derived from what the API
// actually returns. Keep these in sync with the backend DTOs.
// ---------------------------------------------------------------------------

// ---- Auth ----------------------------------------------------------------

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  title?: string;
  bio?: string;
  createdAt: string;
  connectedAccounts: {
    google?: {
      connected: boolean;
      email: string;
      connectedAt: string;
      scopes: string[];
      unreadEmailCount?: number;
      indexedDriveFilesCount?: number;
    };
  };
  preferences: {
    theme?: string;
    notificationChannels?: string[];
    aiTone?: 'professional' | 'playful' | 'concise';
  };
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
}

// ---- Chat / Orchestration ------------------------------------------------

export type OrchestrationPhase =
  | 'intent_parsing'
  | 'policy_check'
  | 'connector_fetch'
  | 'specialist_processing'
  | 'synthesis'
  | 'audit_seal';

export type OrchestrationStepStatus =
  | 'completed'
  | 'in_progress'
  | 'policy_verified'
  | 'failed';

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

export interface ChatMessage {
  id: string;
  sender: 'user' | 'chief';
  text: string;
  orchestrationTrace?: OrchestrationStepTrace[];
  timestamp: string;
}

export interface ChatResponse {
  summary: string;
  orchestrationTrace: OrchestrationStepTrace[];
  intent?: {
    primaryAgent: string;
    taskType: string;
    requiredAgents: string[];
    summary: string;
    scheduleExpression?: string;
  };
  steps?: unknown[];
  details?: Record<string, unknown>;
}

// ---- Jobs ----------------------------------------------------------------

export type JobLifecycleStatus =
  | 'DISCOVERED'
  | 'REVIEWED'
  | 'RECOMMENDED'
  | 'SAVED'
  | 'IGNORED'
  | 'APPLIED'
  | 'INTERVIEWING'
  | 'REJECTED'
  | 'OFFER'
  | 'CLOSED';

export interface JobMatchBreakdown {
  overallScore: number;
  skillMatch: number;
  experienceMatch: number;
  roleMatch: number;
  locationMatch: number;
  salaryMatch: number;
  reasons: string[];
  concerns: string[];
}

export interface Job {
  id: string;
  externalJobId?: string;
  source: string;
  title: string;
  normalizedTitle: string;
  company: string;
  location: string[];
  remote: boolean;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  description: string;
  skills: string[];
  url: string;
  dedupHash: string;
  matchScore?: number;
  matchBreakdown?: JobMatchBreakdown;
  lifecycleStatus: JobLifecycleStatus;
  recommendedResumeId?: string;
  postedAt?: string;
  discoveredAt: string;
}

export interface ResumeProfile {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  targetRole: string;
  tags: string[];
  contentMarkdown: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserCareerProfile {
  userId: string;
  targetRoles: string[];
  skills: string[];
  yearsExperience: number;
  preferredLocations: string[];
  workModePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
  minSalary?: number;
  preferredSalary?: number;
  currency?: string;
  resumes: ResumeProfile[];
}

// ---- Finance -------------------------------------------------------------

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  merchant: string;
  category: string;
  description?: string;
  timestamp: string;
  isRecurring: boolean;
}

export interface SpendingAnalysis {
  userId: string;
  month: string;
  totalIncome: number;
  totalExpense: number;
  remainingDiscretionary: number;
  byCategory: Record<string, number>;
  recurringCommitments: number;
}

// ---- Approvals -----------------------------------------------------------

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ApprovalRequest {
  id: string;
  taskId: string;
  stepId: string;
  userId: string;
  actionType: string;
  capabilityRequired: string;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  userDecisionNote?: string;
  createdAt: string;
  decidedAt?: string;
  executionResult?: {
    executed: boolean;
    executedAt: string;
    details: string;
    artifactUrl?: string;
  };
}

// ---- Audit ---------------------------------------------------------------

export type AuditEventType =
  | 'TASK_CREATED' | 'TASK_STARTED' | 'TASK_COMPLETED' | 'TASK_FAILED'
  | 'AGENT_ASSIGNED' | 'AGENT_STARTED' | 'AGENT_COMPLETED'
  | 'TOOL_CALLED' | 'TOOL_COMPLETED' | 'TOOL_FAILED'
  | 'DATA_ACCESSED' | 'SEARCH_PERFORMED' | 'DECISION_CREATED'
  | 'APPROVAL_REQUESTED' | 'APPROVAL_GRANTED' | 'APPROVAL_REJECTED'
  | 'ACTION_EXECUTED' | 'ACTION_FAILED';

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
  timestamp: string;
}

// ---- Connectors ----------------------------------------------------------

export type ConnectorStatus = 'connected' | 'disconnected' | 'fallback_mode' | 'error';
export type ConnectorType =
  | 'personal_context' | 'job_board' | 'web_search'
  | 'llm_engine' | 'financial_ledger' | 'communication' | 'social';

export interface ConnectorInfo {
  id: string;
  name: string;
  type: ConnectorType;
  status: ConnectorStatus;
  isLive: boolean;
  description: string;
  rateLimit?: string;
  lastSync?: string | null;
  details?: Record<string, unknown>;
}

// ---- UI state helpers ----------------------------------------------------

export type ActivePanel =
  | 'chat'
  | 'jobs'
  | 'finance'
  | 'approvals'
  | 'audit'
  | 'connectors'
  | 'profile';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
}
