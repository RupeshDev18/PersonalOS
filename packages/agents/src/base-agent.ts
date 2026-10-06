import {
  AgentInput,
  AgentResult,
  AgentType,
  BaseAgent,
  Intent,
  StepResult,
} from '@personal-os/shared';
import { ToolGateway } from '@personal-os/tools';

export abstract class AbstractAgent implements BaseAgent {
  public abstract readonly id: string;
  public abstract readonly type: AgentType;
  public abstract readonly name: string;
  public abstract readonly description: string;

  constructor(protected readonly toolGateway: ToolGateway) {}

  public abstract understand(input: AgentInput): Promise<Intent>;
  public abstract plan(input: AgentInput, intent: Intent): Promise<unknown>;
  public abstract execute(stepId: string, payload: unknown): Promise<StepResult>;
  public abstract summarize(result: AgentResult): Promise<string>;
}
