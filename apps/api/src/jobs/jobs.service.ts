import { BadRequestException, Injectable, Inject, NotFoundException, forwardRef } from '@nestjs/common';
import {
  Job,
  JobLifecycleStatus,
  ResumeProfile,
  UserCareerProfile,
} from '@personal-os/shared';
import { DeduplicationService } from './deduplication.service';
import { MatchingEngineService } from './matching-engine.service';
import { ResumeCustomizerService } from './resume-customizer.service';
import { AuditService } from '../audit/audit.service';
import { AuditEventType } from '@personal-os/shared';
import { v4 as uuidv4 } from 'uuid';

import { GreenhouseConnector } from '../connectors/greenhouse.connector';
import { NaukriConnector } from '../connectors/naukri.connector';
import { LinkedInConnector } from '../connectors/linkedin.connector';
import { WellfoundConnector } from '../connectors/wellfound.connector';
import { PrismaService } from '../prisma/prisma.service';
import { PdfCompilerService } from './pdf-compiler.service';
import { GeminiService } from '../llm/gemini.service';

@Injectable()
export class JobsService {
  private jobs: Map<string, Job> = new Map();
  private userProfile?: UserCareerProfile;
  private operatorName = '';
  private operatorEmail = '';

  constructor(
    private readonly deduplicationService: DeduplicationService,
    private readonly matchingEngineService: MatchingEngineService,
    private readonly resumeCustomizerService: ResumeCustomizerService,
    private readonly auditService: AuditService,
    @Inject(forwardRef(() => GreenhouseConnector))
    private readonly greenhouseConnector: GreenhouseConnector,
    @Inject(forwardRef(() => NaukriConnector))
    private readonly naukriConnector: NaukriConnector,
    @Inject(forwardRef(() => LinkedInConnector))
    private readonly linkedinConnector: LinkedInConnector,
    @Inject(forwardRef(() => WellfoundConnector))
    private readonly wellfoundConnector: WellfoundConnector,
    private readonly prisma: PrismaService,
    private readonly pdfCompilerService: PdfCompilerService,
    private readonly geminiService: GeminiService,
  ) {}

  private async ensureInitialized(userId: string): Promise<UserCareerProfile> {
    if (this.userProfile?.userId === userId) return this.userProfile;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    const [career, resumes, dbJobs] = await Promise.all([
      this.prisma.careerProfile.findUnique({ where: { userId } }),
      this.prisma.resumeProfile.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.job.findMany({ where: { userId } }),
    ]);
    this.operatorName = user.name;
    this.operatorEmail = user.email;
    this.userProfile = {
      userId,
      targetRoles: career?.targetRoles ?? [],
      skills: career?.skills ?? [],
      yearsExperience: career?.yearsExperience ?? 0,
      preferredLocations: career?.preferredLocations ?? [],
      workModePreference: (career?.workModePreference as UserCareerProfile['workModePreference']) ?? 'any',
      minSalary: career?.minSalary ?? undefined,
      preferredSalary: career?.preferredSalary ?? undefined,
      currency: career?.currency ?? 'INR',
      excludedCompanies: career?.excludedCompanies ?? [],
      preferredIndustries: career?.preferredIndustries ?? [],
      resumes: resumes
        .filter((resume) => !resume.contentMarkdown.startsWith('# Rupesh Yadav\nSenior Full Stack & AI Systems Engineer')
          && !resume.contentMarkdown.startsWith('# Rupesh Yadav\nSenior Backend & Cloud Architect'))
        .map((resume) => ({ ...resume })),
    };
    this.jobs = new Map(dbJobs.map((job) => [job.id, {
      id: job.id,
      externalJobId: job.externalJobId || undefined,
      source: job.source,
      title: job.title,
      normalizedTitle: job.normalizedTitle,
      company: job.company,
      location: job.location,
      remote: job.remote,
      minSalary: job.minSalary ?? undefined,
      maxSalary: job.maxSalary ?? undefined,
      currency: job.currency || 'INR',
      description: job.description,
      skills: job.skills,
      url: job.url,
      dedupHash: job.dedupHash,
      matchScore: job.matchScore ?? undefined,
      matchBreakdown: (job.matchBreakdown as any) || undefined,
      lifecycleStatus: job.lifecycleStatus as JobLifecycleStatus,
      recommendedResumeId: job.recommendedResumeId || undefined,
      discoveredAt: job.discoveredAt,
    }]));
    if (!career?.skills.length && !career?.targetRoles.length) {
      for (const [id, job] of this.jobs) {
        job.matchScore = undefined;
        job.matchBreakdown = undefined;
        job.recommendedResumeId = undefined;
        if (job.lifecycleStatus === JobLifecycleStatus.RECOMMENDED) {
          job.lifecycleStatus = JobLifecycleStatus.DISCOVERED;
          await this.prisma.job.updateMany({
            where: { id, userId },
            data: { lifecycleStatus: JobLifecycleStatus.DISCOVERED, matchScore: null, recommendedResumeId: null },
          });
        }
      }
    }
    return this.userProfile;
  }

  public async getCareerProfile(userId: string): Promise<UserCareerProfile> {
    return this.ensureInitialized(userId);
  }

  public async getJobs(
    userId: string,
    status?: JobLifecycleStatus,
    minScore?: number,
    search?: string,
    company?: string,
    remoteOnly?: boolean,
  ): Promise<Job[]> {
    await this.ensureInitialized(userId);
    let list = Array.from(this.jobs.values());
    if (status) {
      list = list.filter((j) => j.lifecycleStatus === status);
    }
    if (minScore) {
      list = list.filter((j) => (j.matchScore || 0) >= minScore);
    }
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.skills.some((s) => s.toLowerCase().includes(q)) ||
          j.location.some((l) => l.toLowerCase().includes(q)),
      );
    }
    if (company && company !== 'all') {
      list = list.filter((j) => j.company.toLowerCase() === company.toLowerCase());
    }
    if (remoteOnly !== undefined) {
      list = list.filter((j) => (remoteOnly ? j.remote : true));
    }
    return list.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  }

  public async getJob(userId: string, id: string): Promise<Job | undefined> {
    await this.ensureInitialized(userId);
    return this.jobs.get(id);
  }

  public async updateJobStatus(userId: string, id: string, status: JobLifecycleStatus): Promise<Job> {
    await this.ensureInitialized(userId);
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job with id '${id}' not found`);
    }
    await this.prisma.job.updateMany({
      where: { id, userId },
      data: { lifecycleStatus: status },
    });
    job.lifecycleStatus = status;

    await this.auditService.log({
      taskId: 'job-lifecycle-update',
      userId,
      agentId: 'agent-job',
      eventType: AuditEventType.DECISION_CREATED,
      toolName: 'jobs.status.update',
      outputPayload: { jobId: id, newStatus: status },
      rationale: `User updated job "${job.title}" at ${job.company} to ${status}`,
    });

    return job;
  }

  public async updateCareerProfile(userId: string, update: Partial<UserCareerProfile>): Promise<UserCareerProfile> {
    const profile = await this.ensureInitialized(userId);
    const updated = {
      ...profile,
      targetRoles: update.targetRoles ? [...update.targetRoles] : profile.targetRoles,
      skills: update.skills ? [...update.skills] : profile.skills,
      yearsExperience: update.yearsExperience ?? profile.yearsExperience,
      preferredLocations: update.preferredLocations ? [...update.preferredLocations] : profile.preferredLocations,
      workModePreference: update.workModePreference ?? profile.workModePreference,
      minSalary: update.minSalary ?? profile.minSalary,
      preferredSalary: update.preferredSalary ?? profile.preferredSalary,
      currency: update.currency ?? profile.currency,
      excludedCompanies: update.excludedCompanies ? [...update.excludedCompanies] : profile.excludedCompanies,
      preferredIndustries: update.preferredIndustries ? [...update.preferredIndustries] : profile.preferredIndustries,
    };
    await this.prisma.careerProfile.upsert({
      where: { userId },
      update: {
        targetRoles: updated.targetRoles,
        skills: updated.skills,
        yearsExperience: updated.yearsExperience,
        preferredLocations: updated.preferredLocations,
        workModePreference: updated.workModePreference,
        minSalary: updated.minSalary,
        preferredSalary: updated.preferredSalary,
        currency: updated.currency,
        excludedCompanies: updated.excludedCompanies,
        preferredIndustries: updated.preferredIndustries,
      },
      create: {
        userId,
        targetRoles: updated.targetRoles,
        skills: updated.skills,
        yearsExperience: updated.yearsExperience,
        preferredLocations: updated.preferredLocations,
        workModePreference: updated.workModePreference,
        minSalary: updated.minSalary,
        preferredSalary: updated.preferredSalary,
        currency: updated.currency,
        excludedCompanies: updated.excludedCompanies,
        preferredIndustries: updated.preferredIndustries,
      },
    });
    this.userProfile = updated;

    // Re-score all tracked jobs against new skills/roles immediately
    this.rescoreExistingJobs();

    await this.auditService.log({
      taskId: 'career-profile-update',
      userId,
      agentId: 'agent-job',
      eventType: AuditEventType.DECISION_CREATED,
      toolName: 'jobs.profile.update',
      outputPayload: {
        skillsCount: updated.skills.length,
        targetRoles: updated.targetRoles,
      },
      rationale: `Updated career profile with ${updated.skills.length} skills and re-scored ${this.jobs.size} jobs.`,
    });

    return updated;
  }

  public rescoreExistingJobs() {
    for (const job of this.jobs.values()) {
      if (!this.userProfile || (!this.userProfile.skills.length && !this.userProfile.targetRoles.length)) {
        job.matchScore = undefined;
        job.matchBreakdown = undefined;
        job.lifecycleStatus = JobLifecycleStatus.DISCOVERED;
        continue;
      }
      const { overallScore, breakdown } = this.matchingEngineService.scoreJob(job, this.userProfile);
      job.matchScore = overallScore;
      job.matchBreakdown = breakdown;

      if (this.userProfile.resumes.length > 0) {
        const bestResume = this.resumeCustomizerService.selectBestResume(job, this.userProfile.resumes);
        job.recommendedResumeId = bestResume.fileName;
      }
    }
  }

  public async addOrUpdateResume(userId: string, resume: Partial<ResumeProfile>): Promise<ResumeProfile> {
    const profile = await this.ensureInitialized(userId);
    if (!resume.contentMarkdown?.trim()) {
      throw new BadRequestException('Resume content is required.');
    }
    const id = resume.id || uuidv4();
    const existingRecord = await this.prisma.resumeProfile.findUnique({ where: { id } });
    if (existingRecord && existingRecord.userId !== userId) {
      throw new NotFoundException('Resume not found.');
    }
    const existingIndex = profile.resumes.findIndex((r) => r.id === id);

    const fullResume: ResumeProfile = {
      id,
      userId,
      title: resume.title || 'Custom-Resume.md',
      fileName: resume.fileName || resume.title || 'Custom-Resume.md',
      targetRole: resume.targetRole || profile.targetRoles[0] || 'Unspecified role',
      tags: resume.tags || profile.skills.slice(0, 5),
      contentMarkdown: resume.contentMarkdown || '',
      isDefault: resume.isDefault ?? (profile.resumes.length === 0),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      profile.resumes[existingIndex] = {
        ...profile.resumes[existingIndex],
        ...fullResume,
        updatedAt: new Date(),
      };
    } else {
      profile.resumes.push(fullResume);
    }

    this.rescoreExistingJobs();

    // Persist to PostgreSQL
    await this.prisma.resumeProfile.upsert({
      where: { id: fullResume.id },
      update: {
        title: fullResume.title,
        fileName: fullResume.fileName,
        targetRole: fullResume.targetRole,
        tags: fullResume.tags,
        contentMarkdown: fullResume.contentMarkdown,
        isDefault: fullResume.isDefault,
      },
      create: {
        id: fullResume.id,
        userId: fullResume.userId,
        title: fullResume.title,
        fileName: fullResume.fileName,
        targetRole: fullResume.targetRole,
        tags: fullResume.tags,
        contentMarkdown: fullResume.contentMarkdown,
        isDefault: fullResume.isDefault,
      },
    });

    return fullResume;
  }

  public async deleteResume(userId: string, id: string): Promise<boolean> {
    const profile = await this.ensureInitialized(userId);
    const removed = await this.prisma.resumeProfile.deleteMany({ where: { id, userId } });
    if (removed.count > 0) {
      profile.resumes = profile.resumes.filter((resume) => resume.id !== id);
      this.rescoreExistingJobs();
      return true;
    }
    return false;
  }

  public async getTailoredResume(userId: string, jobId: string) {
    const profile = await this.ensureInitialized(userId);
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }
    const bestResume = this.resumeCustomizerService.selectBestResume(job, profile.resumes);
    return await this.resumeCustomizerService.customize(job, bestResume);
  }

  public async generateResumePdf(userId: string, jobId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const profile = await this.ensureInitialized(userId);
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }
    const tailored = await this.getTailoredResume(userId, jobId);
    const sanitizedCompany = job.company.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedRole = job.title.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${this.operatorName.replace(/[^a-zA-Z0-9]/g, '_')}_${sanitizedCompany}_${sanitizedRole}_Resume.pdf`;

    const buffer = await this.pdfCompilerService.compileResumePdf({
      fullName: this.operatorName,
      email: this.operatorEmail,
      targetRole: `${job.title}`,
      companyTargeted: job.company,
      skills: tailored.emphasizedSkills.length > 0 ? tailored.emphasizedSkills : profile.skills,
      markdownContent: tailored.tailoredMarkdown,
    });

    return { buffer, fileName };
  }

  public async generateCoverLetter(userId: string, jobId: string): Promise<{
    company: string;
    role: string;
    coverLetter: string;
    isLLMGenerated: boolean;
  }> {
    const profile = await this.ensureInitialized(userId);
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }

    if (profile.resumes.length === 0) {
      throw new NotFoundException('Add a resume before generating a cover letter.');
    }
    const sourceResume = this.resumeCustomizerService.selectBestResume(job, profile.resumes);
    const candidateProfile = sourceResume.contentMarkdown;
    const jobDescription = `${job.title} at ${job.company}. Requirements: ${job.skills.join(', ')}. Details: ${job.description || ''}`;

    let coverLetter: string | null = null;
    let isLLMGenerated = false;

    if (this.geminiService.hasApiKey()) {
      try {
        coverLetter = await this.geminiService.generateCoverLetterWithLLM(
          job.company,
          job.title,
          jobDescription,
          candidateProfile,
        );
        if (coverLetter && coverLetter.length > 100) {
          isLLMGenerated = true;
        }
      } catch {
        // fallback
      }
    }

    if (!coverLetter) {
      coverLetter = `Dear Hiring Team at ${job.company},

I am applying for the ${job.title} position. My experience and skills are described in my attached resume. I would welcome the opportunity to discuss whether my background fits the role.

Sincerely,
${this.operatorName}`;
    }

    return {
      company: job.company,
      role: job.title,
      coverLetter,
      isLLMGenerated,
    };
  }

  public async generateCoverLetterPdf(userId: string, jobId: string): Promise<{ buffer: Buffer; fileName: string }> {
    await this.ensureInitialized(userId);
    const result = await this.generateCoverLetter(userId, jobId);
    const sanitizedCompany = result.company.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `${this.operatorName.replace(/[^a-zA-Z0-9]/g, '_')}_${sanitizedCompany}_Cover_Letter.pdf`;

    const buffer = await this.pdfCompilerService.compileCoverLetterPdf({
      fullName: this.operatorName,
      email: this.operatorEmail,
      company: result.company,
      role: result.role,
      letterBody: result.coverLetter,
    });

    return { buffer, fileName };
  }

  /**
   * Complete multi-stage pipeline: Connectors -> Dedup -> Scoring -> Resume Pair
   */
  public async runDiscoveryPipeline(userId: string, triggerReason: string): Promise<{
    discovered: number;
    duplicatesRemoved: number;
    rankedCount: number;
  }> {
    const profile = await this.ensureInitialized(userId);
    const taskId = uuidv4();

    // 1. Ingest raw listings from live Greenhouse boards + Naukri + LinkedIn + Wellfound
    const [ghJobs, naukriJobs, linkedinJobs, wellfoundJobs] = await Promise.all([
      this.greenhouseConnector.search({ roles: profile.targetRoles }).catch(() => []),
      this.naukriConnector.search({ roles: profile.targetRoles }).catch(() => []),
      this.linkedinConnector.search({ roles: profile.targetRoles }).catch(() => []),
      this.wellfoundConnector.search({ roles: profile.targetRoles }).catch(() => []),
    ]);

    const rawJobs: Job[] = [
      ...ghJobs,
      ...naukriJobs,
      ...linkedinJobs,
      ...wellfoundJobs,
    ];

    // 2. Deduplicate
    const existingHashes = new Set(Array.from(this.jobs.values()).map((j) => j.dedupHash));
    const { uniqueJobs, duplicateCount } = this.deduplicationService.deduplicate(rawJobs, existingHashes);

    // 3. Score against user profile and pair resumes
    for (const job of uniqueJobs) {
      if (profile.skills.length || profile.targetRoles.length) {
        const { overallScore, breakdown } = this.matchingEngineService.scoreJob(job, profile);
        job.matchScore = overallScore;
        job.matchBreakdown = breakdown;
      }

      // Select best resume
      if (profile.resumes.length > 0) {
        const bestResume = this.resumeCustomizerService.selectBestResume(job, profile.resumes);
        job.recommendedResumeId = bestResume.id;
      }
      job.lifecycleStatus = job.matchScore === undefined ? JobLifecycleStatus.DISCOVERED : JobLifecycleStatus.RECOMMENDED;

      this.jobs.set(job.id, job);

      // Persist to PostgreSQL
      this.prisma.job
        .upsert({
          where: { dedupHash: job.dedupHash },
          update: {
            matchScore: job.matchScore,
            matchBreakdown: (job.matchBreakdown as object) ?? undefined,
            lifecycleStatus: job.lifecycleStatus,
            recommendedResumeId: job.recommendedResumeId,
          },
          create: {
            id: job.id,
            userId,
            externalJobId: job.externalJobId,
            source: job.source,
            title: job.title,
            normalizedTitle: job.normalizedTitle,
            company: job.company,
            location: job.location,
            remote: job.remote,
            minSalary: job.minSalary,
            maxSalary: job.maxSalary,
            currency: job.currency || 'INR',
            description: job.description,
            skills: job.skills,
            url: job.url,
            dedupHash: job.dedupHash,
            matchScore: job.matchScore,
            matchBreakdown: (job.matchBreakdown as object) ?? undefined,
            lifecycleStatus: job.lifecycleStatus,
            recommendedResumeId: job.recommendedResumeId,
            discoveredAt: job.discoveredAt,
          },
        })
        .catch((error) => {
          this.jobs.delete(job.id);
          throw error;
        });
    }

    this.auditService.log({
      taskId,
      userId,
      agentId: 'agent-job',
      eventType: AuditEventType.TOOL_COMPLETED,
      toolName: 'jobs.discovery_pipeline',
      outputPayload: {
        rawDiscovered: rawJobs.length,
        duplicatesFiltered: duplicateCount,
        newRecommendations: uniqueJobs.length,
      },
      rationale: `Job Agent completed live ATS ingestion pipeline: ${triggerReason}`,
    });

    return {
      discovered: rawJobs.length,
      duplicatesRemoved: duplicateCount,
      rankedCount: uniqueJobs.length,
    };
  }
}
