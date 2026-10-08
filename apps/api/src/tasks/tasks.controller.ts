import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { TasksService } from './tasks.service';
import { CurrentUserId } from '../auth/user.decorator';

export class ChatMessageDto {
  @IsString()
  prompt: string;
}

@ApiTags('tasks')
@Controller('api')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * POST /api/chat
   * Send a prompt to the Chief Agent.
   * userId comes from the validated session token, never the body.
   */
  @Post('chat')
  @ApiOperation({ summary: 'Send a prompt to the Chief Agent' })
  async chat(
    @CurrentUserId() userId: string,
    @Body() body: ChatMessageDto,
  ) {
    return this.tasksService.processUserMessage(body.prompt, userId);
  }

  /** GET /api/tasks — list this user's tasks */
  @Get('tasks')
  @ApiOperation({ summary: 'List all tasks for the current user' })
  getTasks(@CurrentUserId() userId: string) {
    return this.tasksService.getTasks(userId);
  }

  /** GET /api/tasks/:id — get one task (ownership enforced) */
  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get a specific task with step breakdown' })
  getTask(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.tasksService.getTask(id, userId);
  }
}
