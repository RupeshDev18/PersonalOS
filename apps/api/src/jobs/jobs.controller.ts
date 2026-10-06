import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JobLifecycleStatus } from '@personal-os/shared';
import { JobsService } from './jobs.service';

import { IsEnum } from 'class-validator';

export class UpdateJobStatusDto {
  @IsEnum(JobLifecycleStatus)
  status: JobLifecycleStatus;
}

@ApiTags('jobs')
@Controller('api/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List discovered & ranked jobs with match score and tailored resume' })
  @ApiQuery({ name: 'status', required: false, enum: JobLifecycleStatus })
  @ApiQuery({ name: 'minScore', required: false, type: Number })
  getJobs(
    @Query('status') status?: JobLifecycleStatus,
    @Query('minScore') minScore?: number,
  ) {
    return this.jobsService.getJobs(status, minScore ? Number(minScore) : undefined);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user career profile, targets, and resume vault' })
  getCareerProfile() {
    return this.jobsService.getCareerProfile();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job details including match score breakdown and concerns' })
  getJob(@Param('id') id: string) {
    return this.jobsService.getJob(id);
  }

  @Get(':id/resume')
  @ApiOperation({ summary: 'Get tailored non-fabricated resume for this specific job' })
  getTailoredResume(@Param('id') id: string) {
    return this.jobsService.getTailoredResume(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update job lifecycle state (SAVED, IGNORED, APPLIED, etc.)' })
  updateJobStatus(
    @Param('id') id: string,
    @Body() body: UpdateJobStatusDto,
  ) {
    return this.jobsService.updateJobStatus(id, body.status);
  }

  @Post('discover')
  @ApiOperation({ summary: 'Trigger job discovery pipeline on demand' })
  triggerDiscovery() {
    return this.jobsService.runDiscoveryPipeline('Manual on-demand discovery request');
  }
}
