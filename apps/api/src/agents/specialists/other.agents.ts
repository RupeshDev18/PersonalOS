import { AbstractAgent } from '@personal-os/agents';
import { AgentInput, AgentResult, AgentType, Intent, StepResult } from '@personal-os/shared';
import { ToolGateway } from '@personal-os/tools';

export class ShoppingAgent extends AbstractAgent {
  public readonly id = 'agent-shopping';
  public readonly type = AgentType.SHOPPING;
  public readonly name = 'Shopping & Comparison Specialist';
  public readonly description = 'Compares product models, finds alternatives, and tracks pricing.';

  constructor(toolGateway: ToolGateway) {
    super(toolGateway);
  }

  async understand(input: AgentInput): Promise<Intent> {
    return {
      taskType: 'immediate',
      primaryAgent: AgentType.SHOPPING,
      requiredAgents: [AgentType.SHOPPING, AgentType.FINANCE, AgentType.RESEARCH],
      summary: 'Find best pricing and alternatives for requested product',
      rawInput: input.prompt,
    };
  }

  async plan(input: AgentInput, intent: Intent): Promise<unknown> {
    return { steps: ['search_prices', 'find_alternatives'] };
  }

  async execute(stepId: string, payload: { taskId: string; userId: string; product: string }): Promise<StepResult> {
    const data = await this.toolGateway.execute(
      'shopping.search',
      { product: payload.product },
      { taskId: payload.taskId, stepId, agentType: AgentType.SHOPPING, userId: payload.userId }
    );
    return { stepId, success: true, data };
  }

  async summarize(result: AgentResult): Promise<string> {
    return 'Completed product comparison and alternative analysis.';
  }
}

export class FinanceAgent extends AbstractAgent {
  public readonly id = 'agent-finance';
  public readonly type = AgentType.FINANCE;
  public readonly name = 'Finance Specialist (Read-only)';
  public readonly description = 'Read-only financial analysis, budgeting, and purchase affordability evaluation.';

  constructor(toolGateway: ToolGateway) {
    super(toolGateway);
  }

  async understand(input: AgentInput): Promise<Intent> {
    return {
      taskType: 'immediate',
      primaryAgent: AgentType.FINANCE,
      requiredAgents: [AgentType.FINANCE],
      summary: 'Analyze discretionary budget and evaluate affordability',
      rawInput: input.prompt,
    };
  }

  async plan(input: AgentInput, intent: Intent): Promise<unknown> {
    return { steps: ['read_transactions', 'calculate_remaining_budget'] };
  }

  async execute(stepId: string, payload: { taskId: string; userId: string }): Promise<StepResult> {
    const data = await this.toolGateway.execute(
      'finance.transactions.read',
      {},
      { taskId: payload.taskId, stepId, agentType: AgentType.FINANCE, userId: payload.userId }
    );
    return { stepId, success: true, data };
  }

  async summarize(result: AgentResult): Promise<string> {
    return 'Verified current monthly cashflow and budget affordability.';
  }
}

export class ResearchAgent extends AbstractAgent {
  public readonly id = 'agent-research';
  public readonly type = AgentType.RESEARCH;
  public readonly name = 'Research Specialist';
  public readonly description = 'Performs unbiased web research, comparisons, and expert source summarization.';

  constructor(toolGateway: ToolGateway) {
    super(toolGateway);
  }

  async understand(input: AgentInput): Promise<Intent> {
    return {
      taskType: 'immediate',
      primaryAgent: AgentType.RESEARCH,
      requiredAgents: [AgentType.RESEARCH],
      summary: 'Search web sources and aggregate verified reviews',
      rawInput: input.prompt,
    };
  }

  async plan(input: AgentInput, intent: Intent): Promise<unknown> {
    return { steps: ['search_sources', 'summarize_reviews'] };
  }

  async execute(stepId: string, payload: { taskId: string; userId: string; query: string }): Promise<StepResult> {
    const data = await this.toolGateway.execute(
      'research.web.search',
      { query: payload.query },
      { taskId: payload.taskId, stepId, agentType: AgentType.RESEARCH, userId: payload.userId }
    );
    return { stepId, success: true, data };
  }

  async summarize(result: AgentResult): Promise<string> {
    return 'Summarized credible external reviews and benchmarks.';
  }
}

export class CommunicationAgent extends AbstractAgent {
  public readonly id = 'agent-communication';
  public readonly type = AgentType.COMMUNICATION;
  public readonly name = 'Communication & Inbox Specialist';
  public readonly description = 'Syncs verified Gmail messages, tracks recruiter outreach, and drafts communications.';

  constructor(toolGateway: ToolGateway) {
    super(toolGateway);
  }

  async understand(input: AgentInput): Promise<Intent> {
    return {
      taskType: 'immediate',
      primaryAgent: AgentType.COMMUNICATION,
      requiredAgents: [AgentType.COMMUNICATION],
      summary: 'Read and organize Google Workspace emails and correspondence',
      rawInput: input.prompt,
    };
  }

  async plan(input: AgentInput, intent: Intent): Promise<unknown> {
    return { steps: ['fetch_inbox', 'filter_recruiter_threads'] };
  }

  async execute(stepId: string, payload: { taskId: string; userId: string; category?: string }): Promise<StepResult> {
    const data = await this.toolGateway.execute(
      'email.read',
      { category: payload.category },
      { taskId: payload.taskId, stepId, agentType: AgentType.COMMUNICATION, userId: payload.userId }
    );
    return { stepId, success: true, data };
  }

  async summarize(result: AgentResult): Promise<string> {
    return 'Synchronized verified Gmail inbox messages and recruiter outreach.';
  }
}

