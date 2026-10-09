import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  Inject,
  forwardRef,
  NotFoundException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ConnectorRegistryService } from './connector-registry.service';
import { GoogleConnector, GoogleAuthMethod } from './google.connector';
import { GreenhouseConnector } from './greenhouse.connector';
import { GitHubConnector } from './github.connector';
import { SlackConnector } from './slack.connector';
import { GeminiService } from '../llm/gemini.service';
import { JobsService } from '../jobs/jobs.service';
import { CurrentUserId } from '../auth/user.decorator';
import { Public } from '../auth/auth.guard';
import { Response } from 'express';

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export class ConnectGoogleDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  authMethod?: GoogleAuthMethod;

  @IsOptional()
  @IsString()
  credential?: string;
}

export class GoogleOAuthCredentialsDto {
  @IsString()
  clientId: string;

  @IsString()
  clientSecret: string;
}

export class ConnectGithubDto {
  @IsString()
  token: string;
}

export class ConnectSlackDto {
  @IsString()
  webhookUrl: string;

  @IsOptional()
  @IsString()
  channelName?: string;
}

export class OAuthCallbackDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class UpdateGeminiKeyDto {
  @IsString()
  apiKey: string;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

@ApiTags('connectors')
@Controller('api/connectors')
export class ConnectorsController {
  constructor(
    private readonly registry: ConnectorRegistryService,
    private readonly googleConnector: GoogleConnector,
    private readonly greenhouseConnector: GreenhouseConnector,
    private readonly geminiService: GeminiService,
    private readonly githubConnector: GitHubConnector,
    private readonly slackConnector: SlackConnector,
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
  ) {}

  // -------------------------------------------------------------------------
  // Registry
  // -------------------------------------------------------------------------

  @Get()
  @ApiOperation({ summary: 'List all connectors with live status' })
  getAll(@CurrentUserId() _userId: string) {
    return this.registry.getAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single connector status by id' })
  getOne(@CurrentUserId() _userId: string, @Param('id') id: string) {
    const connector = this.registry.get(id);
    if (!connector) throw new NotFoundException(`Connector '${id}' not found.`);
    return connector;
  }

  // -------------------------------------------------------------------------
  // Google Workspace
  // -------------------------------------------------------------------------

  @Get('google/status')
  @ApiOperation({ summary: 'Get Google Workspace connection status' })
  getGoogleStatus(@CurrentUserId() _userId: string) {
    return this.googleConnector.getStatus();
  }

  @Get('google/auth-url')
  @ApiOperation({ summary: 'Get official Google OAuth 2.0 authorization URL' })
  getGoogleAuthUrl(
    @CurrentUserId() _userId: string,
    @Query('redirectUri') redirectUri?: string,
  ) {
    return this.googleConnector.getAuthUrl(redirectUri);
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth 2.0 redirect callback' })
  async handleGoogleOAuthCallback(
    @Query('code') code: string,
    @Query('state') _state: string,
    @Res() res: Response,
  ) {
    if (!code) {
      return res.redirect('http://localhost:3000/?google=error&reason=missing_code');
    }
    try {
      await this.googleConnector.handleOAuthCallback(code);
      return res.redirect('http://localhost:3000/?google=connected');
    } catch (err) {
      const msg = encodeURIComponent((err as Error).message);
      return res.redirect(`http://localhost:3000/?google=error&reason=${msg}`);
    }
  }

  @Public()
  @Post('google/callback')
  @ApiOperation({ summary: 'Handle Google OAuth 2.0 code exchange via POST body' })
  async postGoogleOAuthCallback(@Body() body: OAuthCallbackDto) {
    return this.googleConnector.handleOAuthCallback(body.code, body.redirectUri);
  }

  @Post('google/connect')
  @ApiOperation({ summary: 'Connect Google account (app password or OAuth token)' })
  connectGoogle(
    @CurrentUserId() _userId: string,
    @Body() dto: ConnectGoogleDto,
  ) {
    return this.googleConnector.connect(
      dto.email,
      dto.authMethod ?? 'oauth_consent',
      dto.credential,
    );
  }

  @Post('google/disconnect')
  @ApiOperation({ summary: 'Disconnect Google account' })
  disconnectGoogle(@CurrentUserId() _userId: string) {
    return this.googleConnector.disconnect();
  }

  @Post('google/sync')
  @ApiOperation({ summary: 'Trigger Gmail + Drive sync' })
  syncGoogle(@CurrentUserId() _userId: string) {
    return this.googleConnector.sync();
  }

  @Get('google/gmail')
  @ApiOperation({ summary: 'Get synced Gmail messages' })
  getGmailMessages(
    @CurrentUserId() _userId: string,
    @Query('category') category?: string,
  ) {
    return this.googleConnector.getMessages(category);
  }

  @Get('google/drive')
  @ApiOperation({ summary: 'Get indexed Google Drive files' })
  getDriveFiles(
    @CurrentUserId() _userId: string,
    @Query('type') fileType?: string,
  ) {
    return this.googleConnector.getDriveFiles(fileType);
  }

  @Post('google/drive/import-resume/:fileId')
  @ApiOperation({ summary: 'Import a Drive file as a resume into the Resume Vault' })
  importDriveResume(
    @CurrentUserId() _userId: string,
    @Param('fileId') fileId: string,
  ) {
    const file = this.googleConnector.getDriveFileById(fileId);
    if (!file?.contentMarkdown) {
      throw new NotFoundException(
        'Drive file not found or contains no markdown content.',
      );
    }
    const saved = this.jobsService.addOrUpdateResume({
      id: `resume-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      fileName: file.name,
      targetRole: 'Full Stack Engineer',
      tags: ['Google Drive', 'Imported'],
      contentMarkdown: file.contentMarkdown,
      isDefault: false,
    });
    return {
      success: true,
      message: `Imported "${file.name}" from Google Drive into the Resume Vault.`,
      resume: saved,
    };
  }

  // -------------------------------------------------------------------------
  // Greenhouse
  // -------------------------------------------------------------------------

  @Post('sync/greenhouse')
  @ApiOperation({ summary: 'Test-sync Greenhouse career boards' })
  async syncGreenhouse(@CurrentUserId() _userId: string) {
    const jobs = await this.greenhouseConnector.search({
      roles: ['developer', 'engineer', 'fullstack'],
      limit: 10,
    });
    return {
      success: true,
      jobsFetched: jobs.length,
      sample: jobs.slice(0, 3).map((j) => ({
        company: j.company,
        title: j.title,
        location: j.location,
        url: j.url,
      })),
    };
  }

  // -------------------------------------------------------------------------
  // Gemini LLM
  // -------------------------------------------------------------------------

  @Post('gemini/set-key')
  @ApiOperation({ summary: 'Set or update the Gemini API key' })
  async setGeminiKey(
    @CurrentUserId() _userId: string,
    @Body() body: UpdateGeminiKeyDto,
  ) {
    const success = this.geminiService.setApiKey(body.apiKey);
    if (!success) {
      return {
        success: false,
        message: 'Invalid key — must be at least 10 characters.',
      };
    }
    return this.geminiService.testConnection();
  }

  @Get('gemini/test')
  @ApiOperation({ summary: 'Test the current Gemini connection' })
  testGemini(@CurrentUserId() _userId: string) {
    return this.geminiService.testConnection();
  }

  @Get('gemini/diagnose')
  @ApiOperation({ summary: 'Diagnose the Gemini key format and Google API response' })
  diagnoseGemini(@CurrentUserId() _userId: string) {
    return this.geminiService.diagnoseKey();
  }

  // -------------------------------------------------------------------------
  // Google OAuth Credentials Config
  // -------------------------------------------------------------------------

  @Post('google/config-credentials')
  @ApiOperation({ summary: 'Store custom Google Cloud OAuth client credentials' })
  async saveGoogleOAuthKeys(
    @CurrentUserId() _userId: string,
    @Body() body: GoogleOAuthCredentialsDto,
  ) {
    return this.googleConnector.saveOAuthCredentials(body.clientId, body.clientSecret);
  }

  // -------------------------------------------------------------------------
  // GitHub Developer Index
  // -------------------------------------------------------------------------

  @Get('github/status')
  @ApiOperation({ summary: 'Get GitHub connection status and repository statistics' })
  getGitHubStatus(@CurrentUserId() _userId: string) {
    return this.githubConnector.getStatus();
  }

  @Post('github/connect')
  @ApiOperation({ summary: 'Connect GitHub via Personal Access Token' })
  async connectGitHub(
    @CurrentUserId() _userId: string,
    @Body() dto: ConnectGithubDto,
  ) {
    return this.githubConnector.connect(dto.token);
  }

  @Post('github/disconnect')
  @ApiOperation({ summary: 'Disconnect GitHub integration' })
  async disconnectGitHub(@CurrentUserId() _userId: string) {
    return this.githubConnector.disconnect();
  }

  @Get('github/repos')
  @ApiOperation({ summary: 'Get indexed GitHub repositories' })
  getGitHubRepos(@CurrentUserId() _userId: string) {
    return this.githubConnector.getRepos();
  }

  @Post('github/sync-to-profile')
  @ApiOperation({ summary: 'Enrich candidate profile with GitHub repositories and top languages' })
  async syncGitHubToProfile(@CurrentUserId() _userId: string) {
    const status = this.githubConnector.getStatus();
    if (!status.connected) {
      throw new NotFoundException('GitHub is not connected. Connect with your Personal Access Token first.');
    }

    const repos = this.githubConnector.getRepos();
    const topLanguages = status.topLanguages;

    // Create an automated GitHub project portfolio resume in the vault
    const portfolioMarkdown = `# ${status.profile?.name || status.username} - GitHub Developer Portfolio
**GitHub Profile:** ${status.profile?.htmlUrl || `https://github.com/${status.username}`}
**Public Repositories:** ${status.repoCount} | **Total Stars:** ${status.totalStars}
**Core Languages:** ${topLanguages.join(', ')}

${status.profile?.bio ? `> ${status.profile.bio}\n` : ''}
## Featured Repositories
${repos
  .slice(0, 8)
  .map(
    (r) =>
      `### [${r.name}](${r.htmlUrl}) (${r.language || 'Code'})\n- **Stars:** ${r.stars} | **Forks:** ${r.forks}\n- ${r.description || 'Production codebase'}\n${r.topics.length > 0 ? `- **Topics:** ${r.topics.join(', ')}\n` : ''}`,
  )
  .join('\n')}
`;

    const saved = this.jobsService.addOrUpdateResume({
      id: `resume-github-${Date.now()}`,
      title: `${status.username} - GitHub Live Portfolio`,
      fileName: `github-${status.username}-portfolio.md`,
      targetRole: 'Senior Full Stack & Distributed Systems Architect',
      tags: ['GitHub Sync', ...topLanguages],
      contentMarkdown: portfolioMarkdown,
      isDefault: false,
    });

    return {
      success: true,
      message: `Enriched profile with ${repos.length} GitHub repositories and created portfolio resume.`,
      resume: saved,
    };
  }

  // -------------------------------------------------------------------------
  // Slack Incoming Webhook
  // -------------------------------------------------------------------------

  @Get('slack/status')
  @ApiOperation({ summary: 'Get Slack connection status' })
  getSlackStatus(@CurrentUserId() _userId: string) {
    return this.slackConnector.getStatus();
  }

  @Post('slack/connect')
  @ApiOperation({ summary: 'Connect Slack via Incoming Webhook URL' })
  async connectSlack(
    @CurrentUserId() _userId: string,
    @Body() dto: ConnectSlackDto,
  ) {
    return this.slackConnector.connect(dto.webhookUrl, dto.channelName);
  }

  @Post('slack/disconnect')
  @ApiOperation({ summary: 'Disconnect Slack integration' })
  async disconnectSlack(@CurrentUserId() _userId: string) {
    return this.slackConnector.disconnect();
  }

  @Post('slack/test')
  @ApiOperation({ summary: 'Send a test notification to the configured Slack channel' })
  async testSlack(@CurrentUserId() _userId: string) {
    return this.slackConnector.testMessage();
  }
}
