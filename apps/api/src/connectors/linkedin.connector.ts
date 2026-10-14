import { Injectable } from '@nestjs/common';
import { ConnectorInfo, Job, JobQuery, JobSource } from '@personal-os/shared';

@Injectable()
export class LinkedInConnector implements JobSource {
  public readonly id = 'connector-linkedin';
  public readonly name = 'LinkedIn Jobs';

  public getInfo(): ConnectorInfo {
    return {
      id: this.id,
      name: this.name,
      type: 'job_board',
      status: 'disconnected',
      isLive: false,
      description: 'Disabled until a permitted LinkedIn API integration is configured.',
      details: { accessMode: 'disabled' },
    };
  }

  public async search(_query: JobQuery): Promise<Job[]> {
    return [];
  }

  public async getJob(_id: string): Promise<Job | null> {
    return null;
  }
}
