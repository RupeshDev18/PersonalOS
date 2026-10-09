import { Injectable } from '@nestjs/common';
import { ConnectorInfo } from '@personal-os/shared';
import { GoogleConnector } from './google.connector';
import { GreenhouseConnector } from './greenhouse.connector';
import { WebSearchConnector } from './web-search.connector';
import { GeminiService } from '../llm/gemini.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AccountAggregatorConnector } from './account-aggregator.connector';
import { GitHubConnector } from './github.connector';
import { SlackConnector } from './slack.connector';

// ---------------------------------------------------------------------------
// ConnectorRegistryService
// ---------------------------------------------------------------------------

@Injectable()
export class ConnectorRegistryService {
  constructor(
    private readonly googleConnector: GoogleConnector,
    private readonly greenhouseConnector: GreenhouseConnector,
    private readonly webSearchConnector: WebSearchConnector,
    private readonly geminiService: GeminiService,
    private readonly notificationsService: NotificationsService,
    private readonly accountAggregatorConnector: AccountAggregatorConnector,
    private readonly githubConnector: GitHubConnector,
    private readonly slackConnector: SlackConnector,
  ) {}

  /** Returns live status for every registered connector. */
  public getAll(): ConnectorInfo[] {
    return [
      // 1. Google Workspace (Gmail + Drive) — live state from the connector
      this.googleConnector.getInfo(),

      // 1b. GitHub Developer Index (Repositories, Stars, Contributions)
      this.githubConnector.getInfo(),

      // 1c. Slack Incoming Webhook Bridge (Team Alerts & Approvals)
      this.slackConnector.getInfo(),

      // 2. Greenhouse — always live (public API, no auth needed)
      {
        id: 'connector-greenhouse',
        name: 'Greenhouse Career Boards',
        type: 'job_board',
        status: 'connected',
        isLive: true,
        description:
          'Scrapes public Greenhouse ATS boards for Stripe, Cloudflare, Figma, Datadog, and Airbnb. No API key required.',
        rateLimit: 'Open (5 req/sec)',
        lastSync: new Date().toISOString(),
        details: {
          companies: ['Stripe', 'Cloudflare', 'Figma', 'Datadog', 'Airbnb'],
          authMode: 'Public REST endpoints',
        },
      } satisfies ConnectorInfo,

      // 2b. Naukri.com India Tech Career Boards
      {
        id: 'connector-naukri',
        name: 'Naukri.com India Tech Boards',
        type: 'job_board',
        status: 'connected',
        isLive: true,
        description:
          'Ingests Indian tech unicorn opportunities across Bengaluru, Gurugram, Hyderabad (Razorpay, CRED, Swiggy, Zepto, Groww).',
        rateLimit: 'Active polling',
        lastSync: new Date().toISOString(),
        details: {
          coverage: 'Indian Unicorns & High-Growth Scaleups',
          hubs: ['Bengaluru', 'Gurugram', 'Hyderabad', 'Pune', 'Noida', 'Remote'],
        },
      } satisfies ConnectorInfo,

      // 2c. LinkedIn Jobs India & Remote
      {
        id: 'connector-linkedin',
        name: 'LinkedIn Jobs India',
        type: 'job_board',
        status: 'connected',
        isLive: true,
        description:
          'Ingests top MNC and GCC tech openings across India (Microsoft, Google, Uber, Atlassian, Intuit).',
        rateLimit: 'Live guest search',
        lastSync: new Date().toISOString(),
        details: {
          coverage: 'Tier-1 Tech GCCs & MNC Global Engineering Hubs',
          region: 'India & Remote',
        },
      } satisfies ConnectorInfo,

      // 2d. Wellfound / AngelList Startup Index
      {
        id: 'connector-wellfound',
        name: 'Wellfound Startup Index',
        type: 'job_board',
        status: 'connected',
        isLive: true,
        description:
          'Discovers high-growth startup engineering roles with competitive INR compensation and equity grants.',
        rateLimit: 'Active indexing',
        lastSync: new Date().toISOString(),
        details: {
          coverage: 'Venture-backed startups (AI systems, developer tooling, fintech)',
        },
      } satisfies ConnectorInfo,

      // 3. DuckDuckGo web search — always live
      {
        id: 'connector-duckduckgo',
        name: 'DuckDuckGo Web Search',
        type: 'web_search',
        status: 'connected',
        isLive: true,
        description:
          'Privacy-first web search used by the Research Agent for benchmarks, reviews, and topic intelligence.',
        rateLimit: 'Unmetered',
        lastSync: new Date().toISOString(),
        details: {
          endpoint: 'https://api.duckduckgo.com',
          privacyMode: 'Zero-tracking',
        },
      } satisfies ConnectorInfo,

      // 4. Google Gemini LLM — status driven by whether the key is configured
      {
        id: 'connector-gemini',
        name: 'Google Gemini',
        type: 'llm_engine',
        status: this.geminiService.hasApiKey() ? 'connected' : 'fallback_mode',
        isLive: this.geminiService.hasApiKey(),
        description: this.geminiService.hasApiKey()
          ? 'Gemini LLM active — powering intent parsing and response synthesis.'
          : 'No API key configured. Running in deterministic fallback mode. Set GEMINI_API_KEY in .env to activate.',
        rateLimit: '15 req/min (free tier)',
        lastSync: this.geminiService.hasApiKey() ? new Date().toISOString() : null,
        details: {
          configured: this.geminiService.hasApiKey(),
          instructions: 'Get a free key at https://aistudio.google.com',
        },
      } satisfies ConnectorInfo,

      // 5. Finance ledger — always present, strictly read-only
      {
        id: 'connector-finance-ledger',
        name: 'Finance Ledger',
        type: 'financial_ledger',
        status: 'connected',
        isLive: true,
        description:
          'Local read-only transaction ledger. The Finance Agent uses this to evaluate budget and affordability. Money transfers are permanently disabled.',
        rateLimit: 'Internal — read-only',
        lastSync: new Date().toISOString(),
        details: {
          accessMode: 'READ_ONLY',
          note: 'Financial transfers blocked by PolicyEngine (V1 constraint)',
        },
      } satisfies ConnectorInfo,

      // 6. Telegram Bot Bridge — 1-Tap Mobile Approvals & Alerts
      (() => {
        const tStatus = this.notificationsService.getStatus();
        return {
          id: 'connector-telegram',
          name: 'Telegram Bot Bridge',
          type: 'communication',
          status: tStatus.active ? 'connected' : tStatus.configured ? 'fallback_mode' : 'disconnected',
          isLive: tStatus.active,
          description: tStatus.active
            ? `Active 1-tap mobile approval gate connected to @${tStatus.botUsername || 'bot'}. Long-polling listener is live.`
            : 'Telegram Bot not connected. Connect your bot to receive instant push alerts and approve/reject actions from your phone.',
          rateLimit: '30 msgs/sec',
          lastSync: tStatus.active ? new Date().toISOString() : null,
          details: {
            configured: tStatus.configured,
            active: tStatus.active,
            botUsername: tStatus.botUsername,
            chatId: tStatus.chatId,
            mode: tStatus.mode,
          },
        } satisfies ConnectorInfo;
      })(),

      // 7. RBI Account Aggregator (Setu / OneMoney / Anumati)
      this.accountAggregatorConnector.getInfo(),
    ];
  }

  /** Return status of a single connector by id. */
  public get(id: string): ConnectorInfo | undefined {
    return this.getAll().find((c) => c.id === id);
  }
}
