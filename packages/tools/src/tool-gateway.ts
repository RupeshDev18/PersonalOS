import { PolicyEngine } from '@personal-os/permissions';
import { AuditEvent, AuditEventType } from '@personal-os/shared';
import { ToolContext, ToolDefinition } from './tool.interface.js';

export type AuditLogger = (event: Omit<AuditEvent, 'id' | 'timestamp'>) => Promise<void> | void;

export class ToolGateway {
  private tools = new Map<string, ToolDefinition>();

  constructor(
    private policyEngine: PolicyEngine,
    private auditLogger?: AuditLogger
  ) {}

  public registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.id, tool);
  }

  public getTool(toolId: string): ToolDefinition | undefined {
    return this.tools.get(toolId);
  }

  public listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Executes a tool strictly through permission checking and audit emission
   */
  public async execute<TInput extends Record<string, unknown>, TOutput>(
    toolId: string,
    input: TInput,
    context: ToolContext
  ): Promise<TOutput> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool '${toolId}' is not registered in the Tool Gateway.`);
    }

    // 1. Policy & Authorization Evaluation
    const auth = this.policyEngine.evaluate(context.agentType, tool.requiredCapability);
    if (!auth.allowed) {
      await this.logAudit({
        taskId: context.taskId,
        stepId: context.stepId,
        agentId: context.agentType,
        userId: context.userId,
        eventType: AuditEventType.TOOL_FAILED,
        toolName: toolId,
        inputPayload: input,
        rationale: `Authorization Denied: ${auth.reason}`,
      });
      throw new Error(`Access Denied: ${auth.reason}`);
    }

    if (auth.requiresApproval && !context.approvedByApprovalId) {
      await this.logAudit({
        taskId: context.taskId,
        stepId: context.stepId,
        agentId: context.agentType,
        userId: context.userId,
        eventType: AuditEventType.APPROVAL_REQUESTED,
        toolName: toolId,
        inputPayload: input,
        rationale: auth.reason,
      });
      throw new Error(`Action requires explicit approval before tool execution: ${auth.reason}`);
    }

    // 2. Audit: Tool Started
    await this.logAudit({
      taskId: context.taskId,
      stepId: context.stepId,
      agentId: context.agentType,
      userId: context.userId,
      eventType: AuditEventType.TOOL_CALLED,
      toolName: toolId,
      inputPayload: input,
    });

    const startTime = Date.now();
    try {
      // 3. Execution
      const result = (await tool.execute(input, context)) as TOutput;
      const durationMs = Date.now() - startTime;

      // 4. Audit: Tool Completed
      await this.logAudit({
        taskId: context.taskId,
        stepId: context.stepId,
        agentId: context.agentType,
        userId: context.userId,
        eventType: AuditEventType.TOOL_COMPLETED,
        toolName: toolId,
        outputPayload: typeof result === 'object' && result !== null ? (result as Record<string, unknown>) : { value: result },
        durationMs,
      });

      return result;
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);

      await this.logAudit({
        taskId: context.taskId,
        stepId: context.stepId,
        agentId: context.agentType,
        userId: context.userId,
        eventType: AuditEventType.TOOL_FAILED,
        toolName: toolId,
        durationMs,
        rationale: errorMessage,
      });

      throw err;
    }
  }

  private async logAudit(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    if (this.auditLogger) {
      try {
        await this.auditLogger(event);
      } catch (logErr) {
        console.error('Audit logger failure:', logErr);
      }
    }
  }
}
