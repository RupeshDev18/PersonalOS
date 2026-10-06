export enum JobLifecycleStatus {
  DISCOVERED = 'DISCOVERED',
  REVIEWED = 'REVIEWED',
  RECOMMENDED = 'RECOMMENDED',
  SAVED = 'SAVED',
  IGNORED = 'IGNORED',
  APPLIED = 'APPLIED',
  INTERVIEWING = 'INTERVIEWING',
  REJECTED = 'REJECTED',
  OFFER = 'OFFER',
  CLOSED = 'CLOSED',
}

export interface JobMatchBreakdown {
  overallScore: number;
  skillMatch: number;
  experienceMatch: number;
  roleMatch: number;
  locationMatch: number;
  salaryMatch: number;
  reasons: string[];
  concerns: string[];
}

export interface Job {
  id: string;
  externalJobId?: string;
  source: string;
  title: string;
  normalizedTitle: string;
  company: string;
  location: string[];
  remote: boolean;
  minSalary?: number;
  maxSalary?: number;
  currency?: string;
  description: string;
  skills: string[];
  url: string;
  dedupHash: string;
  matchBreakdown?: JobMatchBreakdown;
  lifecycleStatus: JobLifecycleStatus;
  recommendedResumeId?: string;
  postedAt?: Date;
  discoveredAt: Date;
}

export interface ResumeProfile {
  id: string;
  userId: string;
  title: string;
  fileName: string;
  targetRole: string;
  tags: string[];
  contentMarkdown: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
