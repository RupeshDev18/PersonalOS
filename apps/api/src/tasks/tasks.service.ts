import { Injectable, NotFoundException } from '@nestjs/common';
import { Task, TaskPriority, TaskStatus } from '@personal-os/shared';
import { AgentsService } from '../agents/agents.service';
import { PrismaService } from '../prisma/prisma.service';
import { fileLogger } from '../common/file-logger.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TasksService {
  private tasks: Map<string, Task> = new Map();

  constructor(
    private readonly agentsService: AgentsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Retrieves an existing conversation or creates a new active session for the user.
   */
  async getOrCreateActiveConversation(userId: string, conversationId?: string) {
    if (conversationId) {
      const existing = await this.prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (existing) return existing;
    }

    // Try finding the most recent conversation session
    const recent = await this.prisma.conversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    if (recent) return recent;

    // Create a new session
    return this.prisma.conversation.create({
      data: {
        userId,
        title: 'Chief Agent Session',
      },
    });
  }

  /**
   * Hand the user's prompt to the Chief Agent and persist the conversation & resulting task.
   */
  async processUserMessage(prompt: string, userId: string, conversationId?: string) {
    const chief = this.agentsService.getChief();
    const taskId = uuidv4();

    // 1. Get or create conversation in PostgreSQL
    const conversation = await this.getOrCreateActiveConversation(userId, conversationId);

    // 2. Fetch recent conversation history to provide multi-turn context
    const previousDbMessages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });
    const conversationHistory = previousDbMessages.reverse().map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 3. Persist incoming user prompt to PostgreSQL
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'user',
        content: prompt,
      },
    });

    fileLogger.log(`Received user message in conversation ${conversation.id}`, 'TasksService', {
      userId,
      prompt,
      historyCount: conversationHistory.length,
    });

    // 4. Orchestrate with conversational context
    const result = await chief.orchestrate({
      taskId,
      userId,
      prompt,
      context: {
        conversationId: conversation.id,
        conversationHistory,
      },
    });

    // 5. Persist assistant response to PostgreSQL
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'assistant',
        content: result.summary,
        agentType: result.intent.primaryAgent,
        metadata: {
          taskId,
          steps: result.steps as any,
          orchestrationTrace: result.orchestrationTrace as any,
        },
      },
    });

    // Update conversation timestamp
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

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
      conversationId: conversation.id,
      task,
      intent: result.intent,
      summary: result.summary,
      steps: result.steps,
      details: result.details,
      orchestrationTrace: result.orchestrationTrace,
    };
  }

  /**
   * Get all messages in the active conversation
   */
  async getChatHistory(userId: string, conversationId?: string) {
    const conversation = await this.getOrCreateActiveConversation(userId, conversationId);
    const messages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    return {
      conversationId: conversation.id,
      messages: messages.map((m) => {
        const meta = (m.metadata as any) || {};
        return {
          id: m.id,
          sender: m.role === 'user' ? 'user' : 'chief',
          text: m.content,
          agentType: m.agentType,
          orchestrationTrace: meta.orchestrationTrace || [],
          timestamp: m.createdAt.toLocaleTimeString(),
        };
      }),
    };
  }

  /**
   * Start a fresh conversation session
   */
  async clearChat(userId: string) {
    const newConversation = await this.prisma.conversation.create({
      data: {
        userId,
        title: 'New Chief Agent Session',
      },
    });

    fileLogger.log(`Started new conversation session ${newConversation.id} for user ${userId}`, 'TasksService');

    return {
      success: true,
      conversationId: newConversation.id,
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
