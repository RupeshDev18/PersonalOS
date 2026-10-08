import { Injectable, NotFoundException } from '@nestjs/common';
import { Task, TaskPriority, TaskStatus } from '@personal-os/shared';
import { AgentsService } from '../agents/agents.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TasksService {
  private tasks: Map<string, Task> = new Map();

  constructor(private readonly agentsService: AgentsService) {}

  /**
   * Hand the user's prompt to the Chief Agent and persist the resulting task.
   * The userId comes from the validated session — never from the request body.
   */
  async processUserMessage(prompt: string, userId: string) {
    const chief = this.agentsService.getChief();
    const taskId = uuidv4();

    const result = await chief.orchestrate({ taskId, userId, prompt });

    const task: Task = {
      id: taskId,
      userId,
      title: prompt.slice(0, 80),
      inputPrompt: prompt,
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.NORMAL,
      chiefIntent: result.intent as unknown as Record<string, unknown>,
      assignedAgents: result.intent.requiredAgents,
      steps: result.steps,
      finalSummary: result.summary,
      recurringCron: result.intent.scheduleExpression,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: new Date(),
    };

    this.tasks.set(taskId, task);

    return {
      task,
      intent: result.intent,
      summary: result.summary,
      steps: result.steps,
      details: result.details,
      orchestrationTrace: result.orchestrationTrace,
    };
  }

  getTasks(userId: string): Task[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getTask(id: string, userId: string): Task {
    const task = this.tasks.get(id);
    if (!task) throw new NotFoundException(`Task '${id}' not found.`);
    if (task.userId !== userId) throw new NotFoundException(`Task '${id}' not found.`);
    return task;
  }
}
