export enum CapabilityPermission {
  // Job capabilities
  JOBS_SEARCH = 'jobs.search',
  JOBS_READ = 'jobs.read',
  JOBS_RESUME_READ = 'jobs.resume.read',
  JOBS_RESUME_GENERATE = 'jobs.resume.generate',
  JOBS_APPLICATION_PREPARE = 'jobs.application.prepare',
  JOBS_APPLICATION_SUBMIT = 'jobs.application.submit', // High risk

  // Research capabilities
  RESEARCH_WEB_SEARCH = 'research.web.search',
  RESEARCH_WEB_READ = 'research.web.read',

  // Finance capabilities
  FINANCE_TRANSACTIONS_READ = 'finance.transactions.read',
  FINANCE_ACCOUNTS_READ = 'finance.accounts.read',
  FINANCE_BUDGET_READ = 'finance.budget.read',
  // Note: Financial transfers are explicitly prohibited in V1

  // Shopping capabilities
  SHOPPING_SEARCH = 'shopping.search',
  SHOPPING_COMPARE = 'shopping.compare',
  SHOPPING_PURCHASE = 'shopping.purchase', // High risk

  // Communication capabilities
  EMAIL_READ = 'email.read',
  EMAIL_DRAFT = 'email.draft',
  EMAIL_SEND = 'email.send', // High risk

  // Social capabilities
  SOCIAL_READ = 'social.read',
  SOCIAL_DRAFT = 'social.draft',
  SOCIAL_PUBLISH = 'social.publish', // High risk
}

export enum ApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export interface ApprovalRequest {
  id: string;
  taskId: string;
  stepId: string;
  userId: string;
  actionType: string;
  capabilityRequired: CapabilityPermission;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  status: ApprovalStatus;
  userDecisionNote?: string;
  createdAt: Date;
  decidedAt?: Date;
}
