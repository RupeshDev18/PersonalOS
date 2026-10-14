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
import { NaukriConnector } from './naukri.connector';
import { LinkedInConnector } from './linkedin.connector';
import { ECommerceConnector } from './ecommerce.connector';
import { GoogleSearchConnector } from './google-search.connector';
import { BrowserSessionService, SupportedBrowserPlatform } from './browser-session.service';
import { GeminiService } from '../llm/gemini.service';
import { JobsService } from '../jobs/jobs.service';
import { CurrentUserId } from '../auth/user.decorator';
import { Public } from '../auth/auth.guard';
import { Response } from 'express';
import { createChatModel } from '../agents/langgraph/model-factory';

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

export class UpdateLLMConfigDto {
  @IsString()
  provider: 'gemini' | 'openai' | 'ollama' | 'openrouter';

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsString()
  baseURL?: string;
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
    private readonly naukriConnector: NaukriConnector,
    private readonly linkedinConnector: LinkedInConnector,
    private readonly ecommerceConnector: ECommerceConnector,
    private readonly googleSearchConnector: GoogleSearchConnector,
    private readonly browserSessionService: BrowserSessionService,
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
  async importDriveResume(
    @CurrentUserId() userId: string,
    @Param('fileId') fileId: string,
  ) {
    const file = this.googleConnector.getDriveFileById(fileId);
    if (!file?.contentMarkdown) {
      throw new NotFoundException(
        'Drive file not found or contains no markdown content.',
      );
    }
    const saved = await this.jobsService.addOrUpdateResume(userId, {
      id: `resume-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      fileName: file.name,
      targetRole: 'Imported from Google Drive',
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
  // Multi-Provider LLM Configuration (LangGraph)
  // -------------------------------------------------------------------------

  @Get('llm/config')
  @ApiOperation({ summary: 'Get active LLM provider and model configuration' })
  getLLMConfig(@CurrentUserId() _userId: string) {
    const provider = process.env.LLM_PROVIDER || 'gemini';
    const model =
      provider === 'gemini'
        ? process.env.GEMINI_MODEL_NAME || 'gemini-3.8-flash'
        : provider === 'ollama'
        ? process.env.OLLAMA_MODEL_NAME || 'hermes3'
        : process.env.OPENAI_MODEL_NAME || 'gpt-4o-mini';

    const apiKey =
      provider === 'gemini'
        ? process.env.GEMINI_API_KEY
        : provider === 'openai'
        ? process.env.OPENAI_API_KEY
        : process.env.OPENROUTER_API_KEY;

    return {
      provider,
      modelName: model,
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      configured: Boolean(apiKey || provider === 'ollama'),
      apiKeyMasked: apiKey ? `${apiKey.slice(0, 4)}••••••${apiKey.slice(-4)}` : null,
    };
  }

  @Post('llm/config')
  @ApiOperation({ summary: 'Save active LLM provider and test connection' })
  async updateLLMConfig(
    @CurrentUserId() _userId: string,
    @Body() body: UpdateLLMConfigDto,
  ) {
    process.env.LLM_PROVIDER = body.provider;
    if (body.apiKey) {
      if (body.provider === 'gemini') {
        process.env.GEMINI_API_KEY = body.apiKey;
        this.geminiService.setApiKey(body.apiKey);
      } else if (body.provider === 'openai') {
        process.env.OPENAI_API_KEY = body.apiKey;
      } else if (body.provider === 'openrouter') {
        process.env.OPENROUTER_API_KEY = body.apiKey;
      }
    }
    if (body.modelName) {
      if (body.provider === 'gemini') process.env.GEMINI_MODEL_NAME = body.modelName;
      else if (body.provider === 'openai') process.env.OPENAI_MODEL_NAME = body.modelName;
      else if (body.provider === 'ollama') process.env.OLLAMA_MODEL_NAME = body.modelName;
    }
    if (body.baseURL) {
      process.env.OLLAMA_BASE_URL = body.baseURL;
    }

    try {
      const model = createChatModel({
        provider: body.provider,
        apiKey: body.apiKey,
        modelName: body.modelName,
        baseURL: body.baseURL,
      });

      const res = await model.invoke('Reply with "CONNECTED" only.');
      const reply = typeof res.content === 'string' ? res.content.trim() : 'CONNECTED';

      return {
        success: true,
        message: `Connected successfully to ${body.provider} (${body.modelName || 'default'}). Response: ${reply}`,
        provider: body.provider,
        modelName: body.modelName,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Connection test failed for ${body.provider}: ${err.message}`,
        provider: body.provider,
      };
    }
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
  async syncGitHubToProfile(@CurrentUserId() userId: string) {
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

    const saved = await this.jobsService.addOrUpdateResume(userId, {
      id: `resume-github-${Date.now()}`,
      title: `${status.username} - GitHub Live Portfolio`,
      fileName: `github-${status.username}-portfolio.md`,
      targetRole: 'GitHub portfolio',
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

  // -------------------------------------------------------------------------
  // Indian Tech Career Portals (Naukri & LinkedIn)
  // -------------------------------------------------------------------------

  @Get('naukri/search')
  @ApiOperation({ summary: 'Search Indian tech unicorns on Naukri.com' })
  async searchNaukri(
    @CurrentUserId() _userId: string,
    @Query('role') role?: string,
    @Query('location') location?: string,
  ) {
    return this.naukriConnector.search({
      roles: role ? [role] : ['Software Engineer'],
      location: location || 'Bengaluru',
    });
  }

  @Get('linkedin/search')
  @ApiOperation({ summary: 'Search Indian tech GCCs and remote listings on LinkedIn' })
  async searchLinkedIn(
    @CurrentUserId() _userId: string,
    @Query('role') role?: string,
    @Query('location') location?: string,
  ) {
    return this.linkedinConnector.search({
      roles: role ? [role] : ['Software Engineer'],
      location: location || 'India',
    });
  }

  // -------------------------------------------------------------------------
  // E-Commerce Price Intelligence (Amazon & Flipkart)
  // -------------------------------------------------------------------------

  @Get('ecommerce/amazon')
  @ApiOperation({ summary: 'Search Amazon India for products, deals, and Prime delivery' })
  async searchAmazon(@CurrentUserId() _userId: string, @Query('q') query: string) {
    return this.ecommerceConnector.searchAmazon(query || 'MacBook Air M2');
  }

  @Get('ecommerce/flipkart')
  @ApiOperation({ summary: 'Search Flipkart for electronics and discounts' })
  async searchFlipkart(@CurrentUserId() _userId: string, @Query('q') query: string) {
    return this.ecommerceConnector.searchFlipkart(query || 'MacBook Air M2');
  }

  @Get('ecommerce/compare')
  @ApiOperation({ summary: 'Compare prices side-by-side between Amazon India and Flipkart' })
  async compareECommerce(@CurrentUserId() _userId: string, @Query('q') query: string) {
    return this.ecommerceConnector.comparePrices(query || 'MacBook Air M2');
  }

  // -------------------------------------------------------------------------
  // Google Web Search & Search History
  // -------------------------------------------------------------------------

  @Get('google-search/query')
  @ApiOperation({ summary: 'Perform real-time Google web search' })
  async searchGoogleWeb(@CurrentUserId() _userId: string, @Query('q') query: string) {
    return this.googleSearchConnector.search(query);
  }

  @Get('google-search/history')
  @ApiOperation({ summary: 'Get recent search and research history' })
  getSearchHistory(@CurrentUserId() _userId: string) {
    return this.googleSearchConnector.getSearchHistory();
  }

  @Post('google-search/history/clear')
  @ApiOperation({ summary: 'Clear search history' })
  clearSearchHistory(@CurrentUserId() _userId: string) {
    return this.googleSearchConnector.clearSearchHistory();
  }

  // -------------------------------------------------------------------------
  // Local Browser Session Agent (Amazon, Flipkart, LinkedIn, Naukri)
  // -------------------------------------------------------------------------

  @Post('browser/login/start/:platform')
  @ApiOperation({ summary: 'Launch real Chrome window on user desktop for one-time login with OTP/2FA' })
  async startBrowserLogin(
    @CurrentUserId() _userId: string,
    @Param('platform') platform: SupportedBrowserPlatform,
  ) {
    return this.browserSessionService.startInteractiveLogin(platform);
  }

  @Get('browser/login/status/:platform')
  @ApiOperation({ summary: 'Check status of interactive login session' })
  getBrowserLoginStatus(
    @CurrentUserId() _userId: string,
    @Param('platform') platform: SupportedBrowserPlatform,
  ) {
    return this.browserSessionService.getLoginStatus(platform);
  }

  @Post('browser/login/complete/:platform')
  @ApiOperation({ summary: 'Manually capture and save authenticated session' })
  async completeBrowserLogin(
    @CurrentUserId() _userId: string,
    @Param('platform') platform: SupportedBrowserPlatform,
  ) {
    return this.browserSessionService.completeLogin(platform);
  }

  @Post('browser/login/cancel/:platform')
  @ApiOperation({ summary: 'Cancel interactive login session' })
  async cancelBrowserLogin(
    @CurrentUserId() _userId: string,
    @Param('platform') platform: SupportedBrowserPlatform,
  ) {
    return this.browserSessionService.cancelLogin(platform);
  }

  @Get('browser/account/:platform')
  @ApiOperation({ summary: 'Get account status and recent orders / applications' })
  async getBrowserAccount(
    @CurrentUserId() _userId: string,
    @Param('platform') platform: SupportedBrowserPlatform,
  ) {
    return this.browserSessionService.getAccountStatus(platform);
  }

  @Post('browser/sync/:platform')
  @ApiOperation({ summary: 'Run headless sync to fetch latest orders or applied jobs' })
  async syncBrowserAccount(
    @CurrentUserId() _userId: string,
    @Param('platform') platform: SupportedBrowserPlatform,
  ) {
    return this.browserSessionService.syncAccountData(platform);
  }

  @Post('browser/disconnect/:platform')
  @ApiOperation({ summary: 'Disconnect account and wipe session state' })
  async disconnectBrowserAccount(
    @CurrentUserId() _userId: string,
    @Param('platform') platform: SupportedBrowserPlatform,
  ) {
    return this.browserSessionService.disconnect(platform);
  }
}
