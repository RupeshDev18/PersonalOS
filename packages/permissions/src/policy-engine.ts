import { AgentType, CapabilityPermission } from '@personal-os/shared';
import { ActionPolicy, CAPABILITY_POLICIES, DEFAULT_AGENT_CAPABILITIES } from './approval-rules.js';

export interface AuthorizationCheckResult {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
}

export class PolicyEngine {
  private agentPermissions: Map<AgentType, Set<CapabilityPermission>>;

  constructor(customPermissions?: Partial<Record<AgentType, CapabilityPermission[]>>) {
    this.agentPermissions = new Map();

    // Initialize with defaults
    for (const [agent, perms] of Object.entries(DEFAULT_AGENT_CAPABILITIES)) {
      this.agentPermissions.set(agent as AgentType, new Set(perms));
    }

    // Apply any runtime custom overrides
    if (customPermissions) {
      for (const [agent, perms] of Object.entries(customPermissions)) {
        if (perms) {
          this.agentPermissions.set(agent as AgentType, new Set(perms));
        }
      }
    }
  }

  /**
   * Check if an agent is authorized to perform a specific action capability.
   */
  public evaluate(agentType: AgentType, capability: CapabilityPermission): AuthorizationCheckResult {
    const permissions = this.agentPermissions.get(agentType);
    
    if (!permissions || !permissions.has(capability)) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Agent '${agentType}' lacks capability '${capability}'.`,
      };
    }

    const policy = CAPABILITY_POLICIES[capability];

    if (policy === ActionPolicy.PROHIBITED) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Action capability '${capability}' is permanently prohibited in V1 policy.`,
      };
    }

    if (policy === ActionPolicy.REQUIRES_APPROVAL) {
      return {
        allowed: true,
        requiresApproval: true,
        reason: `Action capability '${capability}' requires explicit human approval before execution.`,
      };
    }

    return {
      allowed: true,
      requiresApproval: false,
    };
  }
}
