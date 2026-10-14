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
  getAllRoutines(@CurrentUserId() _userId: string) {
    return this.routinesService.getAll();
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Toggle routine automation schedule enabled/disabled' })
  toggleRoutine(@CurrentUserId() _userId: string, @Param('id') id: string) {
    return this.routinesService.toggle(id);
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Trigger immediate execution of an autonomous background routine' })
  runRoutineNow(@CurrentUserId() _userId: string, @Param('id') id: string) {
    return this.routinesService.runNow(id);
  }
}
