import { Injectable } from '@nestjs/common';
import { Task, TaskPriority, TaskStatus } from '@personal-os/shared';
import { AgentsService } from '../agents/agents.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TasksService {
  private tasks: Map<string, Task> = new Map();

  constructor(private readonly agentsService: AgentsService) {}

  async processUserMessage(prompt: string, userId = 'default-user') {
    const chief = this.agentsService.getChief();
    const taskId = uuidv4();

    const orchestrationResult = await chief.orchestrate({
      taskId,
      userId,
      prompt,
    });

    const task: Task = {
      id: taskId,
      userId,
      title: prompt.slice(0, 60),
      inputPrompt: prompt,
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.NORMAL,
      chiefIntent: orchestrationResult.intent as unknown as Record<string, unknown>,
      assignedAgents: orchestrationResult.intent.requiredAgents,
      steps: orchestrationResult.steps,
      finalSummary: orchestrationResult.summary,
      recurringCron: orchestrationResult.intent.scheduleExpression,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date(),
    };

    this.tasks.set(taskId, task);

    return {
      task,
      intent: orchestrationResult.intent,
      summary: orchestrationResult.summary,
      steps: orchestrationResult.steps,
      details: orchestrationResult.details,
      orchestrationTrace: orchestrationResult.orchestrationTrace,
    };
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }
}
