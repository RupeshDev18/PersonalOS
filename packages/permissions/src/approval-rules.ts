import { AgentType, CapabilityPermission } from '@personal-os/shared';

export enum ActionPolicy {
  AUTOMATIC = 'AUTOMATIC',
  REQUIRES_APPROVAL = 'REQUIRES_APPROVAL',
  PROHIBITED = 'PROHIBITED',
}

/**
 * Standard capabilities granted to each agent according to Principle 2.2 (Least-privilege)
 */
export const DEFAULT_AGENT_CAPABILITIES: Record<AgentType, CapabilityPermission[]> = {
  [AgentType.CHIEF]: [
    CapabilityPermission.JOBS_SEARCH,
    CapabilityPermission.JOBS_READ,
    CapabilityPermission.RESEARCH_WEB_SEARCH,
    CapabilityPermission.RESEARCH_WEB_READ,
    CapabilityPermission.FINANCE_TRANSACTIONS_READ,
    CapabilityPermission.FINANCE_ACCOUNTS_READ,
    CapabilityPermission.FINANCE_BUDGET_READ,
    CapabilityPermission.SHOPPING_SEARCH,
    CapabilityPermission.SHOPPING_COMPARE,
    CapabilityPermission.EMAIL_READ,
    CapabilityPermission.EMAIL_DRAFT,
    CapabilityPermission.DRIVE_READ,
    CapabilityPermission.DRIVE_SEARCH,
    CapabilityPermission.SOCIAL_READ,
    CapabilityPermission.SOCIAL_DRAFT,
  ],
  [AgentType.RESEARCH]: [
    CapabilityPermission.RESEARCH_WEB_SEARCH,
    CapabilityPermission.RESEARCH_WEB_READ,
  ],
  [AgentType.JOB]: [
    CapabilityPermission.JOBS_SEARCH,
    CapabilityPermission.JOBS_READ,
    CapabilityPermission.JOBS_RESUME_READ,
    CapabilityPermission.JOBS_RESUME_GENERATE,
    CapabilityPermission.JOBS_APPLICATION_PREPARE,
    CapabilityPermission.JOBS_APPLICATION_SUBMIT,
    CapabilityPermission.DRIVE_READ,
    CapabilityPermission.DRIVE_SEARCH,
  ],
  [AgentType.FINANCE]: [
    CapabilityPermission.FINANCE_TRANSACTIONS_READ,
    CapabilityPermission.FINANCE_ACCOUNTS_READ,
    CapabilityPermission.FINANCE_BUDGET_READ,
  ],
  [AgentType.SHOPPING]: [
    CapabilityPermission.SHOPPING_SEARCH,
    CapabilityPermission.SHOPPING_COMPARE,
    CapabilityPermission.SHOPPING_PURCHASE,
  ],
  [AgentType.COMMUNICATION]: [
    CapabilityPermission.EMAIL_READ,
    CapabilityPermission.EMAIL_DRAFT,
    CapabilityPermission.EMAIL_SEND,
  ],
  [AgentType.CONTENT]: [
    CapabilityPermission.SOCIAL_DRAFT,
  ],
  [AgentType.SOCIAL]: [
    CapabilityPermission.SOCIAL_READ,
    CapabilityPermission.SOCIAL_DRAFT,
    CapabilityPermission.SOCIAL_PUBLISH,
  ],
};

/**
 * Policy defining whether an action is Automatic, Requires Approval, or is Prohibited
 */
export const CAPABILITY_POLICIES: Record<CapabilityPermission, ActionPolicy> = {
  [CapabilityPermission.JOBS_SEARCH]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.JOBS_READ]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.JOBS_RESUME_READ]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.JOBS_RESUME_GENERATE]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.JOBS_APPLICATION_PREPARE]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.JOBS_APPLICATION_SUBMIT]: ActionPolicy.REQUIRES_APPROVAL,

  [CapabilityPermission.RESEARCH_WEB_SEARCH]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.RESEARCH_WEB_READ]: ActionPolicy.AUTOMATIC,

  [CapabilityPermission.FINANCE_TRANSACTIONS_READ]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.FINANCE_ACCOUNTS_READ]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.FINANCE_BUDGET_READ]: ActionPolicy.AUTOMATIC,

  [CapabilityPermission.SHOPPING_SEARCH]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.SHOPPING_COMPARE]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.SHOPPING_PURCHASE]: ActionPolicy.REQUIRES_APPROVAL,

  [CapabilityPermission.EMAIL_READ]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.EMAIL_DRAFT]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.EMAIL_SEND]: ActionPolicy.REQUIRES_APPROVAL,

  [CapabilityPermission.DRIVE_READ]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.DRIVE_SEARCH]: ActionPolicy.AUTOMATIC,

  [CapabilityPermission.SOCIAL_READ]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.SOCIAL_DRAFT]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.SOCIAL_PUBLISH]: ActionPolicy.REQUIRES_APPROVAL,
};
