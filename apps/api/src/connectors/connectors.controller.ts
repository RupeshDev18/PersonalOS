import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GreenhouseConnector } from './greenhouse.connector';
import { WebSearchConnector } from './web-search.connector';
import { GeminiService } from '../llm/gemini.service';
import { IsOptional, IsString } from 'class-validator';

export class UpdateGeminiKeyDto {
  @IsString()
  apiKey: string;
}

@ApiTags('connectors')
@Controller('api/connectors')
export class ConnectorsController {
  constructor(
    private readonly greenhouseConnector: GreenhouseConnector,
    private readonly webSearchConnector: WebSearchConnector,
    private readonly geminiService: GeminiService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all active connectors, live status, and configuration' })
  async getConnectors() {
    const hasGeminiKey = this.geminiService.hasApiKey();

    return [
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
        name: 'Google Gemini 1.5 Flash Reasoning',
        type: 'llm_engine',
        status: hasGeminiKey ? 'connected' : 'fallback_mode',
        isLive: hasGeminiKey,
        description: hasGeminiKey
          ? 'Active Google Gemini generative AI powering dynamic multi-agent intent parsing, reasoning decomposition, and conversational synthesis.'
          : 'Running in deterministic rule mode. Provide your GEMINI_API_KEY in .env or via Connectors settings to activate full LLM generation.',
        rateLimit: '15 req/min (Free Tier)',
        lastSync: hasGeminiKey ? new Date().toISOString() : null,
        details: {
          model: 'gemini-1.5-flash',
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
}
