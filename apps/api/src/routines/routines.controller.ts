import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoutinesService } from './routines.service';
import { CurrentUserId } from '../auth/user.decorator';

@ApiTags('routines')
@Controller('api/routines')
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all autonomous background routines and their execution history' })
  getAllRoutines(@CurrentUserId() userId: string) {
    return this.routinesService.getAll(userId);
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Trigger immediate execution of an autonomous background routine' })
  runRoutineNow(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.routinesService.runNow(userId, id);
  }
}
