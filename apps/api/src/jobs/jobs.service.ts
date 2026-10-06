import { Injectable, OnModuleInit } from '@nestjs/common';
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

@Injectable()
export class JobsService implements OnModuleInit {
  private jobs: Map<string, Job> = new Map();
  private userProfile: UserCareerProfile;

  constructor(
    private readonly deduplicationService: DeduplicationService,
    private readonly matchingEngineService: MatchingEngineService,
    private readonly resumeCustomizerService: ResumeCustomizerService,
    private readonly auditService: AuditService,
  ) {
    this.userProfile = {
      userId: 'default-user',
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
          userId: 'default-user',
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
          userId: 'default-user',
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

  onModuleInit() {
    this.runDiscoveryPipeline('Initial bootstrap job discovery');
  }

  public getCareerProfile(): UserCareerProfile {
    return this.userProfile;
  }

  public getJobs(status?: JobLifecycleStatus, minScore?: number): Job[] {
    let list = Array.from(this.jobs.values());
    if (status) {
      list = list.filter((j) => j.lifecycleStatus === status);
    }
    if (minScore) {
      list = list.filter((j) => (j.matchScore || 0) >= minScore);
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

  public getTailoredResume(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found`);
    }
    const bestResume = this.resumeCustomizerService.selectBestResume(job, this.userProfile.resumes);
    return this.resumeCustomizerService.customize(job, bestResume);
  }

  /**
   * Complete multi-stage pipeline: Connectors -> Dedup -> Scoring -> Resume Pair
   */
  public runDiscoveryPipeline(triggerReason: string): {
    discovered: number;
    duplicatesRemoved: number;
    rankedCount: number;
  } {
    const taskId = uuidv4();

    // 1. Ingest raw listings from connectors
    const rawJobs: Job[] = this.getMockSourceJobs();

    // 2. Deduplicate
    const existingHashes = new Set(Array.from(this.jobs.values()).map((j) => j.dedupHash));
    const { uniqueJobs, duplicateCount } = this.deduplicationService.deduplicate(rawJobs, existingHashes);

    // 3. Score against user profile and pair resumes
    for (const job of uniqueJobs) {
      const { overallScore, breakdown } = this.matchingEngineService.scoreJob(job, this.userProfile);
      job.matchScore = overallScore;
      job.matchBreakdown = breakdown;

      // Select best resume
      const bestResume = this.resumeCustomizerService.selectBestResume(job, this.userProfile.resumes);
      job.recommendedResumeId = bestResume.fileName;
      job.lifecycleStatus = JobLifecycleStatus.RECOMMENDED;

      this.jobs.set(job.id, job);
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
      rationale: `Job Agent completed ingestion pipeline: ${triggerReason}`,
    });

    return {
      discovered: rawJobs.length,
      duplicatesRemoved: duplicateCount,
      rankedCount: uniqueJobs.length,
    };
  }

  private getMockSourceJobs(): Job[] {
    return [
      {
        id: 'job-stripe-1',
        externalJobId: 'str-4921',
        source: 'Greenhouse (Stripe)',
        title: 'Senior Full Stack Developer',
        normalizedTitle: 'full stack developer',
        company: 'Stripe',
        location: ['Remote'],
        remote: true,
        minSalary: 2800000,
        maxSalary: 3600000,
        currency: 'INR',
        description: 'Building global developer payment infrastructure using React, TypeScript, Node.js, and PostgreSQL.',
        skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS'],
        url: 'https://stripe.com/jobs/senior-full-stack',
        dedupHash: '',
        lifecycleStatus: JobLifecycleStatus.DISCOVERED,
        discoveredAt: new Date(),
      },
      {
        id: 'job-postman-2',
        externalJobId: 'post-103',
        source: 'Lever (Postman)',
        title: 'Staff Backend Engineer',
        normalizedTitle: 'backend engineer',
        company: 'Postman',
        location: ['Bengaluru', 'Remote'],
        remote: true,
        minSalary: 3500000,
        maxSalary: 4500000,
        currency: 'INR',
        description: 'Lead API performance and distributed systems architecture for 30M+ developers.',
        skills: ['Node.js', 'NestJS', 'PostgreSQL', 'Redis', 'Distributed Systems'],
        url: 'https://postman.com/careers/backend-staff',
        dedupHash: '',
        lifecycleStatus: JobLifecycleStatus.DISCOVERED,
        discoveredAt: new Date(),
      },
      {
        id: 'job-datadog-3',
        externalJobId: 'dd-882',
        source: 'Wellfound (Datadog)',
        title: 'Full Stack Engineer - Cloud Observability',
        normalizedTitle: 'full stack engineer',
        company: 'Datadog',
        location: ['Remote'],
        remote: true,
        minSalary: 2600000,
        maxSalary: 3400000,
        currency: 'INR',
        description: 'Develop rich interactive telemetry dashboards in React and TypeScript with performant Go/Node backends.',
        skills: ['React', 'TypeScript', 'Docker', 'AWS'],
        url: 'https://datadog.com/jobs/full-stack-observability',
        dedupHash: '',
        lifecycleStatus: JobLifecycleStatus.DISCOVERED,
        discoveredAt: new Date(),
      },
      {
        id: 'job-dup-stripe',
        externalJobId: 'str-4921', // Duplicate external ID to test deduplication
        source: 'LinkedIn Aggregator',
        title: 'Senior Full Stack Developer',
        normalizedTitle: 'full stack developer',
        company: 'Stripe',
        location: ['Remote'],
        remote: true,
        description: 'Cross-posted listing for Stripe Senior Full Stack.',
        skills: ['React', 'Node.js'],
        url: 'https://linkedin.com/jobs/view/stripe-dev',
        dedupHash: '',
        lifecycleStatus: JobLifecycleStatus.DISCOVERED,
        discoveredAt: new Date(),
      },
    ];
  }
}
