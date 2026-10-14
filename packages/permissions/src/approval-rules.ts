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
    CapabilityPermission.GITHUB_READ,
    CapabilityPermission.GITHUB_FILE_READ,
    CapabilityPermission.SLACK_READ,
    CapabilityPermission.SLACK_SEND,
    CapabilityPermission.NAUKRI_SEARCH,
    CapabilityPermission.LINKEDIN_SEARCH,
    CapabilityPermission.AMAZON_SEARCH,
    CapabilityPermission.FLIPKART_SEARCH,
    CapabilityPermission.ECOMMERCE_COMPARE,
    CapabilityPermission.AMAZON_USER_ORDERS,
    CapabilityPermission.FLIPKART_USER_ORDERS,
    CapabilityPermission.LINKEDIN_USER_ACTIVITY,
    CapabilityPermission.NAUKRI_USER_ACTIVITY,
    CapabilityPermission.GOOGLE_SEARCH,
    CapabilityPermission.SEARCH_HISTORY_READ,
    CapabilityPermission.ROUTINES_MANAGE,
    CapabilityPermission.ROUTINES_EXECUTE,
    CapabilityPermission.SOCIAL_READ,
    CapabilityPermission.SOCIAL_DRAFT,
  ],
  [AgentType.RESEARCH]: [
    CapabilityPermission.RESEARCH_WEB_SEARCH,
    CapabilityPermission.RESEARCH_WEB_READ,
    CapabilityPermission.GOOGLE_SEARCH,
    CapabilityPermission.SEARCH_HISTORY_READ,
  ],
  [AgentType.JOB]: [
    CapabilityPermission.JOBS_SEARCH,
    CapabilityPermission.JOBS_READ,
    CapabilityPermission.JOBS_RESUME_READ,
    CapabilityPermission.JOBS_RESUME_GENERATE,
    CapabilityPermission.JOBS_APPLICATION_PREPARE,
    CapabilityPermission.JOBS_APPLICATION_SUBMIT,
    CapabilityPermission.NAUKRI_SEARCH,
    CapabilityPermission.LINKEDIN_SEARCH,
    CapabilityPermission.NAUKRI_USER_ACTIVITY,
    CapabilityPermission.LINKEDIN_USER_ACTIVITY,
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
    CapabilityPermission.AMAZON_SEARCH,
    CapabilityPermission.FLIPKART_SEARCH,
    CapabilityPermission.ECOMMERCE_COMPARE,
    CapabilityPermission.AMAZON_USER_ORDERS,
    CapabilityPermission.FLIPKART_USER_ORDERS,
  ],
  [AgentType.COMMUNICATION]: [
    CapabilityPermission.EMAIL_READ,
    CapabilityPermission.EMAIL_DRAFT,
    CapabilityPermission.EMAIL_SEND,
    CapabilityPermission.DRIVE_READ,
    CapabilityPermission.DRIVE_SEARCH,
    CapabilityPermission.SLACK_READ,
    CapabilityPermission.SLACK_SEND,
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

  [CapabilityPermission.GITHUB_READ]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.GITHUB_FILE_READ]: ActionPolicy.AUTOMATIC,

  [CapabilityPermission.SLACK_READ]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.SLACK_SEND]: ActionPolicy.AUTOMATIC,

  [CapabilityPermission.NAUKRI_SEARCH]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.LINKEDIN_SEARCH]: ActionPolicy.AUTOMATIC,

  [CapabilityPermission.AMAZON_SEARCH]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.FLIPKART_SEARCH]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.ECOMMERCE_COMPARE]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.AMAZON_USER_ORDERS]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.FLIPKART_USER_ORDERS]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.LINKEDIN_USER_ACTIVITY]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.NAUKRI_USER_ACTIVITY]: ActionPolicy.AUTOMATIC,

  [CapabilityPermission.GOOGLE_SEARCH]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.SEARCH_HISTORY_READ]: ActionPolicy.AUTOMATIC,

  [CapabilityPermission.ROUTINES_MANAGE]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.ROUTINES_EXECUTE]: ActionPolicy.AUTOMATIC,

  [CapabilityPermission.SOCIAL_READ]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.SOCIAL_DRAFT]: ActionPolicy.AUTOMATIC,
  [CapabilityPermission.SOCIAL_PUBLISH]: ActionPolicy.REQUIRES_APPROVAL,
};
