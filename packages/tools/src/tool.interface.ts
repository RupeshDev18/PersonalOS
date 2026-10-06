import { AgentType, CapabilityPermission } from '@personal-os/shared';

export interface ToolContext {
  taskId: string;
  stepId?: string;
  agentType: AgentType;
  userId: string;
  approvedByApprovalId?: string;
}

export interface ToolDefinition<TInput = Record<string, unknown>, TOutput = unknown> {
  id: string;
  name: string;
  description: string;
  requiredCapability: CapabilityPermission;
  execute(input: TInput, context: ToolContext): Promise<TOutput>;
}
