import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConnectorInfo } from '@personal-os/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  htmlUrl: string;
  language: string | null;
  stars: number;
  forks: number;
  updatedAt: string;
  topics: string[];
}

export interface GitHubProfile {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  publicRepos: number;
  followers: number;
  htmlUrl: string;
}

export interface GitHubStatus {
  connected: boolean;
  username: string | null;
  tokenMasked: string | null;
  lastSync: string | null;
  repoCount: number;
  totalStars: number;
  topLanguages: string[];
  profile: GitHubProfile | null;
}

@Injectable()
export class GitHubConnector implements OnModuleInit {
  private readonly logger = new Logger(GitHubConnector.name);

  private connected = false;
  private token: string | null = null;
  private username: string | null = null;
  private profile: GitHubProfile | null = null;
  private repos: GitHubRepo[] = [];
  private lastSync: Date | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const config = await this.prisma.connectorConfig.findUnique({
        where: { id: 'connector-github' },
      });

      if (config && config.isLive && config.details) {
        const d = config.details as any;
        this.connected = true;
        this.token = d.token || null;
        this.username = d.username || null;
        this.profile = d.profile || null;
        this.repos = d.repos || [];
        this.lastSync = config.updatedAt;
        this.logger.log(`Restored GitHub connection for @${this.username} from PostgreSQL.`);

        // Background sync
        this.sync().catch((err) => this.logger.warn(`GitHub initial sync error: ${err.message}`));
      }
    } catch (err) {
      this.logger.warn(`Could not load GitHub connector config: ${(err as Error).message}`);
    }
  }

  public getInfo(): ConnectorInfo {
    return {
      id: 'connector-github',
      name: 'GitHub Developer Index',
      type: 'personal_context',
      status: this.connected ? 'connected' : 'disconnected',
      isLive: this.connected,
      description:
        'Syncs your active GitHub repositories, languages, stars, and contribution topics directly into your Resume Vault and skills matcher.',
      rateLimit: '5,000 req/hr (Authenticated)',
      lastSync: this.lastSync?.toISOString() ?? null,
      details: {
        username: this.username,
        reposCount: this.repos.length,
        totalStars: this.repos.reduce((acc, r) => acc + r.stars, 0),
        topLanguages: this.getTopLanguages(),
        instructions: this.connected
          ? undefined
          : 'Provide your GitHub Personal Access Token (classic with repo scope or fine-grained) to index your code accomplishments.',
      },
    };
  }

  public getStatus(): GitHubStatus {
    return {
      connected: this.connected,
      username: this.username,
      tokenMasked: this.token ? `${this.token.slice(0, 4)}••••••${this.token.slice(-4)}` : null,
      lastSync: this.lastSync?.toISOString() ?? null,
      repoCount: this.repos.length,
      totalStars: this.repos.reduce((acc, r) => acc + r.stars, 0),
      topLanguages: this.getTopLanguages(),
      profile: this.profile,
    };
  }

  public async connect(token: string): Promise<GitHubStatus> {
    const cleanToken = token.trim();
    if (!cleanToken || cleanToken.length < 10) {
      throw new BadRequestException('A valid GitHub Personal Access Token (PAT) is required.');
    }

    this.token = cleanToken;
    this.logger.log('Validating GitHub PAT and fetching user profile...');

    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'PersonalOS-Agent',
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`GitHub authentication failed: ${errText}`);
      throw new BadRequestException(`GitHub authentication failed (HTTP ${res.status}): Please check token validity.`);
    }

    const userData = await res.json();
    this.username = userData.login;
    this.profile = {
      login: userData.login,
      name: userData.name || userData.login,
      avatarUrl: userData.avatar_url,
      bio: userData.bio,
      publicRepos: userData.public_repos,
      followers: userData.followers,
      htmlUrl: userData.html_url,
    };

    this.connected = true;
    this.lastSync = new Date();

    await this.sync();
    await this.persist();

    return this.getStatus();
  }

  public async disconnect(): Promise<GitHubStatus> {
    this.connected = false;
    this.token = null;
    this.username = null;
    this.profile = null;
    this.repos = [];
    this.lastSync = null;

    await this.persist();
    this.logger.log('GitHub connector disconnected.');
    return this.getStatus();
  }

  public async sync(): Promise<GitHubStatus> {
    if (!this.connected || !this.token) return this.getStatus();

    try {
      const res = await fetch('https://api.github.com/user/repos?sort=pushed&per_page=30&affiliation=owner,collaborator', {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'PersonalOS-Agent',
        },
      });

      if (res.ok) {
        const repoData: any[] = await res.json();
        this.repos = repoData.map((r) => ({
          id: r.id,
          name: r.name,
          fullName: r.full_name,
          description: r.description,
          htmlUrl: r.html_url,
          language: r.language,
          stars: r.stargazers_count || 0,
          forks: r.forks_count || 0,
          updatedAt: r.updated_at,
          topics: r.topics || [],
        }));
        this.lastSync = new Date();
        await this.persist();
        this.logger.log(`Synced ${this.repos.length} live repositories for @${this.username}`);
      }
    } catch (err) {
      this.logger.warn(`Error fetching GitHub repos: ${(err as Error).message}`);
    }

    return this.getStatus();
  }

  public getRepos(): GitHubRepo[] {
    return this.repos;
  }

  public getTopLanguages(): string[] {
    const counts: Record<string, number> = {};
    for (const r of this.repos) {
      if (r.language) {
        counts[r.language] = (counts[r.language] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([lang]) => lang)
      .slice(0, 6);
  }

  private async persist(): Promise<void> {
    try {
      await this.prisma.connectorConfig.upsert({
        where: { id: 'connector-github' },
        update: {
          name: 'GitHub Developer Index',
          type: 'personal_context',
          status: this.connected ? 'connected' : 'disconnected',
          isLive: this.connected,
          details: {
            token: this.token,
            username: this.username,
            profile: this.profile,
            repos: this.repos,
          } as any,
          updatedAt: new Date(),
        },
        create: {
          id: 'connector-github',
          name: 'GitHub Developer Index',
          type: 'personal_context',
          status: this.connected ? 'connected' : 'disconnected',
          isLive: this.connected,
          details: {
            token: this.token,
            username: this.username,
            profile: this.profile,
            repos: this.repos,
          } as any,
        },
      });
    } catch (err) {
      this.logger.warn(`Failed persisting GitHub connector: ${(err as Error).message}`);
    }
  }
}
