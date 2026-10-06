import { Injectable, OnModuleInit } from '@nestjs/common';
import { AgentRegistry } from '@personal-os/agents';
import { ToolsService } from '../tools/tools.service';
import { AuditService } from '../audit/audit.service';
import { JobAgent } from './specialists/job.agent';
import { FinanceAgent, ResearchAgent, ShoppingAgent } from './specialists/other.agents';
import { ChiefAgent } from './chief.agent';

@Injectable()
export class AgentsService implements OnModuleInit {
  private registry = new AgentRegistry();
  private chiefAgent: ChiefAgent;

  constructor(
    private readonly toolsService: ToolsService,
    private readonly auditService: AuditService,
  ) {}

  onModuleInit() {
    const gateway = this.toolsService.getGateway();

    // 1. Register Specialist Agents
    const jobAgent = new JobAgent(gateway);
    const researchAgent = new ResearchAgent(gateway);
    const financeAgent = new FinanceAgent(gateway);
    const shoppingAgent = new ShoppingAgent(gateway);

    this.registry.register(jobAgent);
    this.registry.register(researchAgent);
    this.registry.register(financeAgent);
    this.registry.register(shoppingAgent);

    // 2. Register Chief Agent
    this.chiefAgent = new ChiefAgent(gateway, this.registry, this.auditService);
    this.registry.register(this.chiefAgent);
  }

  public getChief(): ChiefAgent {
    return this.chiefAgent;
  }

  public getRegistry(): AgentRegistry {
    return this.registry;
  }
}
