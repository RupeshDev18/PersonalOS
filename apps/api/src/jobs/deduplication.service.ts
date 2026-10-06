import { Injectable } from '@nestjs/common';
import { Job, JobLifecycleStatus } from '@personal-os/shared';
import * as crypto from 'crypto';

@Injectable()
export class DeduplicationService {
  /**
   * Generates a normalized deduplication hash based on company, title, and location
   */
  public generateHash(company: string, title: string, location: string[], externalId?: string): string {
    const normCompany = company.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const normTitle = title.trim().toLowerCase()
      .replace(/senior|lead|staff|principal|sr\.|jr\.|junior/g, '')
      .replace(/[^a-z0-9]/g, '');
    const normLoc = location.map((l) => l.trim().toLowerCase()).sort().join('-');
    const seed = externalId ? `${normCompany}:${externalId}` : `${normCompany}:${normTitle}:${normLoc}`;
    
    return crypto.createHash('sha256').update(seed).digest('hex').substring(0, 16);
  }

  /**
   * Deduplicates a batch of jobs against existing jobs and within the batch itself
   */
  public deduplicate(incomingJobs: Job[], existingJobHashes: Set<string>): {
    uniqueJobs: Job[];
    duplicateCount: number;
  } {
    const uniqueJobs: Job[] = [];
    const seenInBatch = new Set<string>();
    let duplicateCount = 0;

    for (const job of incomingJobs) {
      const hash = job.dedupHash || this.generateHash(job.company, job.title, job.location, job.externalJobId);
      job.dedupHash = hash;

      if (existingJobHashes.has(hash) || seenInBatch.has(hash)) {
        duplicateCount++;
        continue;
      }

      seenInBatch.add(hash);
      uniqueJobs.push(job);
    }

    return { uniqueJobs, duplicateCount };
  }
}
