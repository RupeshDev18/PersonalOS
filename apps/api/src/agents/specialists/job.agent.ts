import { AbstractAgent } from '@personal-os/agents';
import { AgentInput, AgentResult, AgentType, Intent, StepResult } from '@personal-os/shared';
import { ToolGateway } from '@personal-os/tools';

export class JobAgent extends AbstractAgent {
  public readonly id = 'agent-job';
  public readonly type = AgentType.JOB;
  public readonly name = 'Job & Career Specialist';
  public readonly description = 'Discovers roles across feeds, scores relevance against skills, and customizes verified resumes.';

  constructor(toolGateway: ToolGateway) {
    super(toolGateway);
  }

  async understand(input: AgentInput): Promise<Intent> {
    return {
      taskType: input.prompt.toLowerCase().includes('every') ? 'recurring' : 'immediate',
      primaryAgent: AgentType.JOB,
      requiredAgents: [AgentType.JOB],
      summary: 'Search and rank candidate jobs matching career profile',
      rawInput: input.prompt,
    };
  }

  async plan(input: AgentInput, intent: Intent): Promise<unknown> {
    return {
      steps: [
        { action: 'fetch_jobs', description: 'Query job connectors' },
        { action: 'dedup_jobs', description: 'Deduplicate listings' },
        { action: 'match_score', description: 'Score skills and experience' },
        { action: 'pair_resume', description: 'Tailor and pair best resume' },
      ],
    };
  }

  async execute(stepId: string, payload: { taskId: string; userId: string; query?: string }): Promise<StepResult> {
    const searchResult = await this.toolGateway.execute(
      'jobs.search',
      { query: payload.query || 'software engineer', remote: true, count: 20 },
      {
        taskId: payload.taskId,
        stepId,
        agentType: AgentType.JOB,
        userId: payload.userId,
      }
    );

    return {
      stepId,
      success: true,
      data: searchResult,
    };
  }

  async summarize(result: AgentResult): Promise<string> {
    return `Discovered high-match jobs tailored to your tech stack.`;
  }
}
