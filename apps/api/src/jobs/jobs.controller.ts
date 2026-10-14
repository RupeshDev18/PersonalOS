import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JobLifecycleStatus } from '@personal-os/shared';
import { JobsService } from './jobs.service';
import { CurrentUserId } from '../auth/user.decorator';
import { IsArray, IsBoolean, IsEnum, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Response } from 'express';

export class UpdateJobStatusDto {
  @IsEnum(JobLifecycleStatus)
  status: JobLifecycleStatus;
}

export class UpdateCareerProfileDto {
  @IsOptional() @IsArray() @IsString({ each: true }) targetRoles?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) skills?: string[];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) yearsExperience?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) preferredLocations?: string[];
  @IsOptional() @IsIn(['remote', 'hybrid', 'onsite', 'any']) workModePreference?: 'remote' | 'hybrid' | 'onsite' | 'any';
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minSalary?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) preferredSalary?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) excludedCompanies?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) preferredIndustries?: string[];
}

export class UpsertResumeDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() fileName?: string;
  @IsOptional() @IsString() targetRole?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[];
  @IsString() contentMarkdown: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
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
    @CurrentUserId() userId: string,
    @Query('status') status?: JobLifecycleStatus,
    @Query('minScore') minScore?: number,
    @Query('search') search?: string,
    @Query('company') company?: string,
    @Query('remote') remote?: string,
  ) {
    return this.jobsService.getJobs(
      userId,
      status,
      minScore ? Number(minScore) : undefined,
      search,
      company,
      remote === 'true' ? true : remote === 'false' ? false : undefined,
    );
  }

  @Post('trigger-discovery')
  @ApiOperation({ summary: 'Trigger live job discovery pipeline' })
  async triggerDiscovery(@CurrentUserId() userId: string) {
    return this.jobsService.runDiscoveryPipeline(userId, 'Manual trigger from dashboard');
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get career profile and resume vault' })
  getCareerProfile(@CurrentUserId() userId: string) {
    return this.jobsService.getCareerProfile(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update career profile skills and preferences' })
  updateCareerProfile(
    @CurrentUserId() userId: string,
    @Body() body: UpdateCareerProfileDto,
  ) {
    return this.jobsService.updateCareerProfile(userId, body);
  }

  @Post('resumes')
  @ApiOperation({ summary: 'Add or update a resume in the vault' })
  addOrUpdateResume(
    @CurrentUserId() userId: string,
    @Body() body: UpsertResumeDto,
  ) {
    return this.jobsService.addOrUpdateResume(userId, body);
  }

  @Delete('resumes/:id')
  @ApiOperation({ summary: 'Delete a resume from the vault' })
  deleteResume(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.jobsService.deleteResume(userId, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job details including match score breakdown' })
  getJob(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.jobsService.getJob(userId, id);
  }

  @Get(':id/resume')
  @ApiOperation({ summary: 'Get tailored resume for a specific job' })
  getTailoredResume(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.jobsService.getTailoredResume(userId, id);
  }

  @Post(':id/tailor-resume')
  @ApiOperation({ summary: 'Generate tailored resume on demand' })
  tailorResume(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.jobsService.getTailoredResume(userId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update job lifecycle status' })
  updateJobStatus(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body() body: UpdateJobStatusDto,
  ) {
    return this.jobsService.updateJobStatus(userId, id, body.status);
  }

  @Get(':id/download-resume-pdf')
  @ApiOperation({ summary: 'Compile and stream ATS-friendly resume PDF' })
  async downloadResumePdf(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.jobsService.generateResumePdf(userId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }

  @Post(':id/generate-cover-letter')
  @ApiOperation({ summary: 'Synthesize tailored cover letter for this job' })
  generateCoverLetter(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
  ) {
    return this.jobsService.generateCoverLetter(userId, id);
  }

  @Get(':id/download-cover-letter-pdf')
  @ApiOperation({ summary: 'Compile and stream tailored cover letter PDF' })
  async downloadCoverLetterPdf(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const { buffer, fileName } = await this.jobsService.generateCoverLetterPdf(userId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
