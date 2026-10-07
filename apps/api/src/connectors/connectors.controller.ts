import { Body, Controller, Get, Param, Post, Query, Inject, forwardRef } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GreenhouseConnector } from './greenhouse.connector';
import { WebSearchConnector } from './web-search.connector';
import { GoogleConnector } from './google.connector';
import { GeminiService } from '../llm/gemini.service';
import { JobsService } from '../jobs/jobs.service';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateGeminiKeyDto {
  @IsString()
  apiKey: string;
}

export class ConnectGoogleDto {
  @IsOptional()
  @IsString()
  email?: string;
}

@ApiTags('connectors')
@Controller('api/connectors')
export class ConnectorsController {
  constructor(
    private readonly greenhouseConnector: GreenhouseConnector,
    private readonly webSearchConnector: WebSearchConnector,
    private readonly googleConnector: GoogleConnector,
    private readonly geminiService: GeminiService,
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all active connectors, live status, and configuration' })
  async getConnectors() {
    const hasGeminiKey = this.geminiService.hasApiKey();
    const googleStatus = this.googleConnector.getStatus();

    return [
      {
        id: 'connector-google-workspace',
        name: 'Google Workspace (Gmail & Drive)',
        type: 'personal_context',
        status: googleStatus.connected ? 'connected' : 'disconnected',
        isLive: googleStatus.connected,
        description: 'Synchronizes your verified inbox emails, recruiter messages, and Google Drive resume markdown documents directly into Chief Ghost context.',
        rateLimit: 'OAuth 2.0 (250 req/sec)',
        lastSync: googleStatus.lastSync,
        details: {
          account: googleStatus.email,
          unreadEmails: googleStatus.unreadEmails,
          indexedDriveFiles: googleStatus.indexedFilesCount,
          scopes: googleStatus.scopes,
        },
      },
      {
        id: 'connector-greenhouse',
        name: 'Greenhouse Live Career API',
        type: 'job_board',
        status: 'connected',
        isLive: true,
        description: 'Direct ATS scraper connecting to public career endpoints of Stripe, Figma, Cloudflare, and GitHub. No auth required.',
        rateLimit: 'Open (5 req/sec)',
        lastSync: new Date().toISOString(),
        details: {
          targetCompanies: ['Stripe', 'Figma', 'Cloudflare', 'GitHub'],
          authMode: 'Public API REST Endpoints',
        },
      },
      {
        id: 'connector-duckduckgo',
        name: 'DuckDuckGo Web Search & Intelligence',
        type: 'web_search',
        status: 'connected',
        isLive: true,
        description: 'Instant answers & review aggregator querying live web search APIs for market benchmarks, specs, and price checks.',
        rateLimit: 'Open (unmetered)',
        lastSync: new Date().toISOString(),
        details: {
          endpoint: 'https://api.duckduckgo.com',
          privacyMode: 'Zero-tracking / Zero-cookie',
        },
      },
      {
        id: 'connector-gemini',
        name: 'Google Gemini Flash LLM Reasoning',
        type: 'llm_engine',
        status: hasGeminiKey ? 'connected' : 'fallback_mode',
        isLive: hasGeminiKey,
        description: hasGeminiKey
          ? 'Active Google Gemini generative AI powering dynamic multi-agent intent parsing, reasoning decomposition, and conversational synthesis.'
          : 'Running in deterministic rule mode. Provide your GEMINI_API_KEY in .env or via Connectors settings to activate full LLM generation.',
        rateLimit: '15 req/min (Free Tier)',
        lastSync: hasGeminiKey ? new Date().toISOString() : null,
        details: {
          model: 'gemini-3.8-flash / gemini-flash-latest',
          configured: hasGeminiKey,
          instructions: 'Get a free key at https://aistudio.google.com and set GEMINI_API_KEY in .env',
        },
      },
      {
        id: 'connector-finance-ledger',
        name: 'Discretionary Banking Ledger (Read-Only)',
        type: 'financial_ledger',
        status: 'connected',
        isLive: true,
        description: 'Local financial ledger providing categorized transactions, recurring commitments, and safe affordability ceilings.',
        rateLimit: 'Internal (Strictly Read-Only)',
        lastSync: new Date().toISOString(),
        details: {
          accessMode: 'READ_ONLY (Money transfers blocked by PolicyEngine)',
          monitoredAccounts: ['Primary Checking (HDFC)', 'Discretionary Card (ICICI)'],
        },
      },
    ];
  }

  // --- Google Workspace Endpoints ---

  @Get('google/status')
  @ApiOperation({ summary: 'Get Google Workspace (Gmail + Drive) connection status' })
  getGoogleStatus() {
    return this.googleConnector.getStatus();
  }

  @Post('google/connect')
  @ApiOperation({ summary: 'Connect Google account' })
  connectGoogle(@Body() dto: ConnectGoogleDto) {
    return this.googleConnector.connect(dto.email);
  }

  @Post('google/disconnect')
  @ApiOperation({ summary: 'Disconnect Google account' })
  disconnectGoogle() {
    return this.googleConnector.disconnect();
  }

  @Post('google/sync')
  @ApiOperation({ summary: 'Trigger sync of Gmail and Drive' })
  syncGoogle() {
    return this.googleConnector.sync();
  }

  @Get('google/gmail')
  @ApiOperation({ summary: 'Get Gmail inbox messages' })
  getGmailMessages(@Query('category') category?: string) {
    return this.googleConnector.getMessages(category);
  }

  @Get('google/drive')
  @ApiOperation({ summary: 'Get Google Drive indexed files' })
  getDriveFiles(@Query('type') fileType?: string) {
    return this.googleConnector.getDriveFiles(fileType);
  }

  @Post('google/drive/import-resume/:fileId')
  @ApiOperation({ summary: 'Import a resume directly from Google Drive into Resume Vault' })
  importDriveResume(@Param('fileId') fileId: string) {
    const file = this.googleConnector.getDriveFileById(fileId);
    if (!file || !file.contentMarkdown) {
      return { success: false, message: 'Drive file not found or contains no markdown content.' };
    }

    const savedResume = this.jobsService.addOrUpdateResume({
      id: `resume-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
      fileName: file.name,
      targetRole: 'Full Stack Engineer',
      tags: ['Google Drive', 'Imported', 'Cloud'],
      contentMarkdown: file.contentMarkdown,
      isDefault: false,
    });

    return {
      success: true,
      message: `Successfully imported "${file.name}" from Google Drive into your Career Resume Vault!`,
      resume: savedResume,
    };
  }

  // --- Greenhouse Endpoints ---

  @Post('sync/greenhouse')
  @ApiOperation({ summary: 'Trigger live test sync of Greenhouse job boards' })
  async syncGreenhouse() {
    const jobs = await this.greenhouseConnector.search({
      roles: ['developer', 'engineer', 'fullstack'],
      limit: 10,
    });
    return {
      success: true,
      message: `Successfully connected to Greenhouse public APIs. Fetched ${jobs.length} live openings across target companies.`,
      jobsFetched: jobs.length,
      sampleJobs: jobs.slice(0, 3).map((j) => ({
        company: j.company,
        title: j.title,
        location: j.location,
        url: j.url,
      })),
    };
  }

  // --- Gemini Endpoints ---

  @Post('gemini/set-key')
  @ApiOperation({ summary: 'Dynamically set or update Gemini API Key' })
  async setGeminiKey(@Body() body: UpdateGeminiKeyDto) {
    const success = this.geminiService.setApiKey(body.apiKey);
    if (!success) {
      return { success: false, message: 'Invalid API key provided. Must be at least 10 characters.' };
    }
    const testResult = await this.geminiService.testConnection();
    return testResult;
  }

  @Get('gemini/test')
  @ApiOperation({ summary: 'Test current Gemini LLM connection' })
  async testGemini() {
    return this.geminiService.testConnection();
  }

  @Get('gemini/diagnose')
  @ApiOperation({ summary: 'Diagnose current Gemini key format and Google response' })
  async diagnoseGemini() {
    return this.geminiService.diagnoseKey();
  }
}
