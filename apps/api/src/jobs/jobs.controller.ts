import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JobLifecycleStatus, ResumeProfile, UserCareerProfile } from '@personal-os/shared';
import { JobsService } from './jobs.service';
import { CurrentUserId } from '../auth/user.decorator';
import { IsEnum } from 'class-validator';
import { Response } from 'express';

export class UpdateJobStatusDto {
  @IsEnum(JobLifecycleStatus)
  status: JobLifecycleStatus;
}

@ApiTags('jobs')
@Controller('api/jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'List discovered & ranked jobs' })
  @ApiQuery({ name: 'status', required: false, enum: JobLifecycleStatus })
  @ApiQuery({ name: 'minScore', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'company', required: false, type: String })
  @ApiQuery({ name: 'remote', required: false, type: String })
  getJobs(
    @CurrentUserId() _userId: string,
    @Query('status') status?: JobLifecycleStatus,
    @Query('minScore') minScore?: number,
    @Query('search') search?: string,
    @Query('company') company?: string,
    @Query('remote') remote?: string,
  ) {
    return this.jobsService.getJobs(
      status,
      minScore ? Number(minScore) : undefined,
      search,
      company,
      remote === 'true' ? true : remote === 'false' ? false : undefined,
    );
  }

  @Post('trigger-discovery')
  @ApiOperation({ summary: 'Trigger live job discovery pipeline' })
  async triggerDiscovery(@CurrentUserId() _userId: string) {
    return this.jobsService.runDiscoveryPipeline('Manual trigger from dashboard');
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get career profile and resume vault' })
  getCareerProfile(@CurrentUserId() _userId: string) {
    return this.jobsService.getCareerProfile();
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update career profile skills and preferences' })
  updateCareerProfile(
    @CurrentUserId() _userId: string,
    @Body() body: Partial<UserCareerProfile>,
  ) {
    return this.jobsService.updateCareerProfile(body);
  }

  @Post('resumes')
  @ApiOperation({ summary: 'Add or update a resume in the vault' })
  addOrUpdateResume(
    @CurrentUserId() _userId: string,
    @Body() body: Partial<ResumeProfile>,
  ) {
    return this.jobsService.addOrUpdateResume(body);
  }

  @Delete('resumes/:id')
  @ApiOperation({ summary: 'Delete a resume from the vault' })
  deleteResume(
    @CurrentUserId() _userId: string,
    @Param('id') id: string,
  ) {
    return { success: this.jobsService.deleteResume(id) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job details including match score breakdown' })
  getJob(
    @CurrentUserId() _userId: string,
    @Param('id') id: string,
  ) {
    return this.jobsService.getJob(id);
  }

  @Get(':id/resume')
  @ApiOperation({ summary: 'Get tailored resume for a specific job' })
  getTailoredResume(
    @CurrentUserId() _userId: string,
    @Param('id') id: string,
  ) {
    return this.jobsService.getTailoredResume(id);
  }

  @Post(':id/tailor-resume')
  @ApiOperation({ summary: 'Generate tailored resume on demand' })
  tailorResume(
    @CurrentUserId() _userId: string,
    @Param('id') id: string,
  ) {
    return this.jobsService.getTailoredResume(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update job lifecycle status' })
  updateJobStatus(
    @CurrentUserId() _userId: string,
    @Param('id') id: string,
    @Body() body: UpdateJobStatusDto,
  ) {
    return this.jobsService.updateJobStatus(id, body.status);
  }

  @Get(':id/download-resume-pdf')
  @ApiOperation({ summary: 'Compile and stream ATS-friendly resume PDF' })
  async downloadResumePdf(
    @CurrentUserId() _userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.jobsService.generateResumePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Post(':id/generate-cover-letter')
  @ApiOperation({ summary: 'Synthesize tailored cover letter for this job' })
  generateCoverLetter(
    @CurrentUserId() _userId: string,
    @Param('id') id: string,
  ) {
    return this.jobsService.generateCoverLetter(id);
  }

  @Get(':id/download-cover-letter-pdf')
  @ApiOperation({ summary: 'Compile and stream tailored cover letter PDF' })
  async downloadCoverLetterPdf(
    @CurrentUserId() _userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.jobsService.generateCoverLetterPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
