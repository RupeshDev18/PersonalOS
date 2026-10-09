import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
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
export class JobsService implements OnModuleInit {
  private jobs: Map<string, Job> = new Map();
  private userProfile: UserCareerProfile;

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
  ) {
    this.userProfile = {
      userId: 'user-rupesh',   // seeded profile — replace with per-user lookup for multi-user support
      targetRoles: ['Full Stack Developer', 'Backend Engineer', 'Distributed Systems'],
      skills: [
        'React',
        'TypeScript',
        'Node.js',
        'PostgreSQL',
        'AWS',
        'Docker',
        'NestJS',
        'Next.js',
        'Redis',
        'TailwindCSS',
      ],
      yearsExperience: 3.5,
      preferredLocations: ['Remote', 'Bengaluru', 'Delhi NCR'],
      workModePreference: 'remote',
      minSalary: 2200000,
      preferredSalary: 3000000,
      currency: 'INR',
      resumes: [
        {
          id: 'res-fullstack-aws',
          userId: 'user-rupesh',
          title: 'Fullstack-AWS-v3.md',
          fileName: 'Fullstack-AWS-v3.md',
          targetRole: 'Full Stack Developer',
          tags: ['React', 'TypeScript', 'Node.js', 'AWS', 'PostgreSQL', 'Docker'],
          isDefault: true,
          contentMarkdown: `## Summary\nFull Stack Engineer with 3.5+ years experience building scalable web architectures using React, Node.js, and AWS.\n\n## Experience\n- Built distributed microservices serving 100k+ daily users.\n- Architected Postgres + Redis caching tier reducing latency by 45%.`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'res-backend-systems',
          userId: 'user-rupesh',
          title: 'Backend-Systems-v2.md',
          fileName: 'Backend-Systems-v2.md',
          targetRole: 'Backend Engineer',
          tags: ['Node.js', 'NestJS', 'PostgreSQL', 'Redis', 'Distributed Systems'],
          isDefault: false,
          contentMarkdown: `## Summary\nBackend Engineer specializing in resilient APIs, queue orchestration, and database optimization.\n\n## Experience\n- Designed high-throughput BullMQ event processing pipeline.\n- Maintained 99.99% uptime across production NestJS microservices.`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
  }

  async onModuleInit() {
    try {
      const dbJobs = await this.prisma.job.findMany({
        where: { userId: 'user-rupesh' },
      });
      if (dbJobs && dbJobs.length > 0) {
        for (const j of dbJobs) {
          this.jobs.set(j.id, {
            id: j.id,
            externalJobId: j.externalJobId || undefined,
            source: j.source,
            title: j.title,
            normalizedTitle: j.normalizedTitle,
            company: j.company,
            location: j.location,
            remote: j.remote,
            minSalary: j.minSalary || undefined,
            maxSalary: j.maxSalary || undefined,
            currency: j.currency || 'INR',
            description: j.description,
            skills: j.skills,
            url: j.url,
            dedupHash: j.dedupHash,
            matchScore: j.matchScore || undefined,
            matchBreakdown: (j.matchBreakdown as any) || undefined,
            lifecycleStatus: j.lifecycleStatus as JobLifecycleStatus,
            recommendedResumeId: j.recommendedResumeId || undefined,
            discoveredAt: j.discoveredAt,
          });
        }
      }

      const dbResumes = await this.prisma.resumeProfile.findMany({
        where: { userId: 'user-rupesh' },
      });
      if (dbResumes && dbResumes.length > 0) {
        this.userProfile.resumes = dbResumes.map((r) => ({
          id: r.id,
          userId: r.userId,
          title: r.title,
          fileName: r.fileName,
          targetRole: r.targetRole,
          tags: r.tags,
          contentMarkdown: r.contentMarkdown,
          isDefault: r.isDefault,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        }));
      }
    } catch {
      // Memory fallback
    }

    if (this.jobs.size === 0) {
      await this.runDiscoveryPipeline('Initial bootstrap job discovery');
    }
  }

  public getCareerProfile(): UserCareerProfile {
    return this.userProfile;
  }

  public getJobs(
    status?: JobLifecycleStatus,
    minScore?: number,
    search?: string,
    company?: string,
    remoteOnly?: boolean,
  ): Job[] {
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

  public getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  public updateJobStatus(id: string, status: JobLifecycleStatus): Job {
    const job = this.jobs.get(id);
    if (!job) {
      throw new Error(`Job with id '${id}' not found`);
    }
    job.lifecycleStatus = status;

    this.prisma.job.update({
      where: { id },
      data: { lifecycleStatus: status },
    }).catch(() => {});

    this.auditService.log({
      taskId: 'job-lifecycle-update',
      userId: this.userProfile.userId,
      agentId: 'agent-job',
      eventType: AuditEventType.DECISION_CREATED,
      toolName: 'jobs.status.update',
      outputPayload: { jobId: id, newStatus: status },
      rationale: `User updated job "${job.title}" at ${job.company} to ${status}`,
    });

    return job;
  }

  public getResumes(): ResumeProfile[] {
    return this.userProfile.resumes;
  }

  public updateCareerProfile(update: Partial<UserCareerProfile>): UserCareerProfile {
    this.userProfile = {
      ...this.userProfile,
      ...update,
      skills: update.skills ? [...update.skills] : this.userProfile.skills,
      targetRoles: update.targetRoles ? [...update.targetRoles] : this.userProfile.targetRoles,
      preferredLocations: update.preferredLocations ? [...update.preferredLocations] : this.userProfile.preferredLocations,
    };

    // Re-score all tracked jobs against new skills/roles immediately
    this.rescoreExistingJobs();

    this.auditService.log({
      taskId: 'career-profile-update',
      userId: this.userProfile.userId,
      agentId: 'agent-job',
      eventType: AuditEventType.DECISION_CREATED,
      toolName: 'jobs.profile.update',
      outputPayload: {
        skillsCount: this.userProfile.skills.length,
        targetRoles: this.userProfile.targetRoles,
      },
      rationale: `Updated career profile with ${this.userProfile.skills.length} skills and re-scored ${this.jobs.size} jobs.`,
    });

    return this.userProfile;
  }

  public rescoreExistingJobs() {
    for (const job of this.jobs.values()) {
      const { overallScore, breakdown } = this.matchingEngineService.scoreJob(job, this.userProfile);
      job.matchScore = overallScore;
      job.matchBreakdown = breakdown;

      if (this.userProfile.resumes.length > 0) {
        const bestResume = this.resumeCustomizerService.selectBestResume(job, this.userProfile.resumes);
        job.recommendedResumeId = bestResume.fileName;
      }
    }
  }

  public addOrUpdateResume(resume: Partial<ResumeProfile>): ResumeProfile {
    const id = resume.id || `res-${Date.now()}`;
    const existingIndex = this.userProfile.resumes.findIndex((r) => r.id === id);

    const fullResume: ResumeProfile = {
      id,
      userId: this.userProfile.userId,
      title: resume.title || 'Custom-Resume.md',
      fileName: resume.fileName || resume.title || 'Custom-Resume.md',
      targetRole: resume.targetRole || this.userProfile.targetRoles[0] || 'Software Engineer',
      tags: resume.tags || this.userProfile.skills.slice(0, 5),
      contentMarkdown: resume.contentMarkdown || '# Experience\n\n- Software Engineer',
      isDefault: resume.isDefault ?? (this.userProfile.resumes.length === 0),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (existingIndex >= 0) {
      this.userProfile.resumes[existingIndex] = {
        ...this.userProfile.resumes[existingIndex],
        ...fullResume,
        updatedAt: new Date(),
      };
    } else {
      this.userProfile.resumes.push(fullResume);
    }

    this.rescoreExistingJobs();

    // Persist to PostgreSQL
    this.prisma.resumeProfile.upsert({
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
    }).catch(() => {});

    return fullResume;
  }

  public deleteResume(id: string): boolean {
    const initialLen = this.userProfile.resumes.length;
    this.userProfile.resumes = this.userProfile.resumes.filter((r) => r.id !== id);
    if (this.userProfile.resumes.length !== initialLen) {
      this.rescoreExistingJobs();
      this.prisma.resumeProfile.delete({ where: { id } }).catch(() => {});
      return true;
    }
    return false;
  }

  public async getTailoredResume(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }
    const bestResume = this.resumeCustomizerService.selectBestResume(job, this.userProfile.resumes);
    return await this.resumeCustomizerService.customize(job, bestResume);
  }

  public async generateResumePdf(jobId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }
    const tailored = await this.getTailoredResume(jobId);
    const sanitizedCompany = job.company.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedRole = job.title.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Rupesh_Yadav_${sanitizedCompany}_${sanitizedRole}_Resume.pdf`;

    const buffer = await this.pdfCompilerService.compileResumePdf({
      fullName: 'Rupesh Yadav',
      email: 'ry993494787@gmail.com',
      phone: '+91 99349 4787',
      location: 'Bengaluru, India (Remote Available)',
      github: 'https://github.com/RupeshDev18',
      linkedin: 'https://linkedin.com/in/rupesh-dev',
      targetRole: `${job.title}`,
      companyTargeted: job.company,
      summary: `Results-driven Senior Full Stack & AI Systems Engineer with 3.5+ years experience building fault-tolerant distributed web applications and high-throughput background systems. Highly proficient in TypeScript, React/Next.js, NestJS, and AWS. Tailored specifically for ${job.title} at ${job.company}.`,
      skills: tailored.emphasizedSkills.length > 0 ? tailored.emphasizedSkills : this.userProfile.skills,
      markdownContent: tailored.tailoredMarkdown,
    });

    return { buffer, fileName };
  }

  public async generateCoverLetter(jobId: string): Promise<{
    company: string;
    role: string;
    coverLetter: string;
    isLLMGenerated: boolean;
  }> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }

    const candidateProfile = `Rupesh Yadav, Senior Full Stack Engineer (3.5+ years exp). Stack: Next.js, React, TypeScript, NestJS, Node.js, PostgreSQL, AWS, Docker, Redis. Built autonomous agent platforms, real-time financial tracking pipelines, and high-conversion web frontends.`;
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

I am writing to express my strong interest in the ${job.title} position at ${job.company}. Having followed ${job.company}'s recent technical milestones and market impact, I am inspired by your team's standard of engineering excellence and product velocity.

With over 3.5 years of hands-on production engineering experience, I specialize in architecting modern full stack systems using ${job.skills.slice(0, 4).join(', ')}. In my recent work, I designed autonomous multi-agent pipelines, resilient real-time financial tracking systems, and high-performance React/Next.js applications backed by NestJS and PostgreSQL on AWS. My focus has consistently been on creating software that is robust, maintainable, and delightful to use.

What excites me most about joining ${job.company} is the opportunity to apply this foundation to your core product challenges. I take deep ownership over the features I ship, collaborate proactively across cross-functional teams, and prioritize measurable business outcomes.

I would welcome the opportunity to discuss how my background and problem-solving methodology can add value to ${job.company}'s engineering roadmap. Thank you for your time and consideration.

Sincerely,
Rupesh Yadav`;
    }

    return {
      company: job.company,
      role: job.title,
      coverLetter,
      isLLMGenerated,
    };
  }

  public async generateCoverLetterPdf(jobId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const result = await this.generateCoverLetter(jobId);
    const sanitizedCompany = result.company.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Rupesh_Yadav_${sanitizedCompany}_Cover_Letter.pdf`;

    const buffer = await this.pdfCompilerService.compileCoverLetterPdf({
      fullName: 'Rupesh Yadav',
      email: 'ry993494787@gmail.com',
      phone: '+91 99349 4787',
      location: 'Bengaluru, India',
      company: result.company,
      role: result.role,
      letterBody: result.coverLetter,
    });

    return { buffer, fileName };
  }

  /**
   * Complete multi-stage pipeline: Connectors -> Dedup -> Scoring -> Resume Pair
   */
  public async runDiscoveryPipeline(triggerReason: string): Promise<{
    discovered: number;
    duplicatesRemoved: number;
    rankedCount: number;
  }> {
    const taskId = uuidv4();

    // 1. Ingest raw listings from live Greenhouse boards + Naukri + LinkedIn + Wellfound
    const [ghJobs, naukriJobs, linkedinJobs, wellfoundJobs] = await Promise.all([
      this.greenhouseConnector.search({ roles: this.userProfile.targetRoles }).catch(() => []),
      this.naukriConnector.search({ roles: this.userProfile.targetRoles }).catch(() => []),
      this.linkedinConnector.search({ roles: this.userProfile.targetRoles }).catch(() => []),
      this.wellfoundConnector.search({ roles: this.userProfile.targetRoles }).catch(() => []),
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
      const { overallScore, breakdown } = this.matchingEngineService.scoreJob(job, this.userProfile);
      job.matchScore = overallScore;
      job.matchBreakdown = breakdown;

      // Select best resume
      if (this.userProfile.resumes.length > 0) {
        const bestResume = this.resumeCustomizerService.selectBestResume(job, this.userProfile.resumes);
        job.recommendedResumeId = bestResume.fileName;
      }
      job.lifecycleStatus = JobLifecycleStatus.RECOMMENDED;

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
            userId: 'user-rupesh',
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
        .catch(() => {});
    }

    this.auditService.log({
      taskId,
      userId: this.userProfile.userId,
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
