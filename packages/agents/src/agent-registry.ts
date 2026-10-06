import { AgentType } from '@personal-os/shared';
import { AbstractAgent } from './base-agent.js';

export class AgentRegistry {
  private agents = new Map<AgentType, AbstractAgent>();

  public register(agent: AbstractAgent): void {
    this.agents.set(agent.type, agent);
  }

  public get(agentType: AgentType): AbstractAgent | undefined {
    return this.agents.get(agentType);
  }

  public getAll(): AbstractAgent[] {
    return Array.from(this.agents.values());
  }

  public has(agentType: AgentType): boolean {
    return this.agents.has(agentType);
  }
}
