import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';

export class ChatMessageDto {
  prompt: string;
  userId?: string;
}

@ApiTags('tasks')
@Controller('api')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send a prompt directly to the Chief Agent' })
  async chat(@Body() body: ChatMessageDto) {
    return this.tasksService.processUserMessage(body.prompt, body.userId);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'List all multi-agent tasks' })
  getTasks() {
    return this.tasksService.getTasks();
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: 'Get details and step breakdown of a specific task' })
  getTask(@Param('id') id: string) {
    return this.tasksService.getTask(id);
  }
}
