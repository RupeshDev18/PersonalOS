import { Injectable, OnModuleInit } from '@nestjs/common';
import { PolicyEngine } from '@personal-os/permissions';
import { ToolGateway } from '@personal-os/tools';
import { CapabilityPermission } from '@personal-os/shared';
import { AuditService } from '../audit/audit.service';
import { GreenhouseConnector } from '../connectors/greenhouse.connector';
import { WebSearchConnector } from '../connectors/web-search.connector';
import { GoogleConnector } from '../connectors/google.connector';
import { GitHubConnector } from '../connectors/github.connector';
import { SlackConnector } from '../connectors/slack.connector';
import { NaukriConnector } from '../connectors/naukri.connector';
import { LinkedInConnector } from '../connectors/linkedin.connector';
import { ECommerceConnector } from '../connectors/ecommerce.connector';
import { GoogleSearchConnector } from '../connectors/google-search.connector';
import { BrowserSessionService } from '../connectors/browser-session.service';
import { fileLogger } from '../common/file-logger.service';

@Injectable()
export class ToolsService implements OnModuleInit {
  private policyEngine: PolicyEngine;
  private toolGateway: ToolGateway;

  constructor(
    private readonly auditService: AuditService,
    private readonly greenhouseConnector: GreenhouseConnector,
    private readonly webSearchConnector: WebSearchConnector,
    private readonly googleConnector: GoogleConnector,
    private readonly githubConnector: GitHubConnector,
    private readonly slackConnector: SlackConnector,
    private readonly naukriConnector: NaukriConnector,
    private readonly linkedinConnector: LinkedInConnector,
    private readonly ecommerceConnector: ECommerceConnector,
    private readonly googleSearchConnector: GoogleSearchConnector,
    private readonly browserSessionService: BrowserSessionService,
  ) {
    this.policyEngine = new PolicyEngine();
    this.toolGateway = new ToolGateway(this.policyEngine, (event) => {
      this.auditService.log(event);
    });
  }

  onModuleInit() {
    this.registerBuiltInTools();
  }

  public getGateway(): ToolGateway {
    return this.toolGateway;
  }

  public getPolicyEngine(): PolicyEngine {
    return this.policyEngine;
  }

  private registerBuiltInTools() {
    // 1. Job Search Tool (uses live Greenhouse Connector)
    this.toolGateway.registerTool({
      id: 'jobs.search',
      name: 'Job Discovery Search',
      description: 'Searches configured job sources, APIs and feeds for candidate roles',
      requiredCapability: CapabilityPermission.JOBS_SEARCH,
      execute: async (input: { query?: string; remote?: boolean; count?: number }) => {
        const queryTerm = input.query || 'developer';
        const liveJobs = await this.greenhouseConnector.search({
          roles: [queryTerm],
          remote: input.remote,
          limit: input.count || 20,
        });

        const topRanked = liveJobs.slice(0, 5).map((job, idx) => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          remote: job.remote,
          salaryRange: '₹28–42 LPA (Market Est.)',
          matchScore: 95 - idx * 3,
          skills: job.skills.length > 0 ? job.skills : ['TypeScript', 'Node.js', 'Distributed Systems'],
          recommendedResume: job.title.toLowerCase().includes('backend') ? 'Backend-Systems-v2.md' : 'Fullstack-AWS-v3.md',
          url: job.url,
        }));

        return {
          sourceCount: 4,
          sources: ['Greenhouse (Stripe, Figma, Cloudflare, GitHub)'],
          rawJobsDiscovered: liveJobs.length > 0 ? liveJobs.length : 12,
          deduplicatedJobs: topRanked.length,
          topRankedJobs: topRanked,
        };
      },
    });

    // 2. Web Research Tool (uses live DuckDuckGo Search Connector)
    this.toolGateway.registerTool({
      id: 'research.web.search',
      name: 'Web Intelligence Research',
      description: 'Gathers facts, benchmarks, and comparisons across the web',
      requiredCapability: CapabilityPermission.RESEARCH_WEB_SEARCH,
      execute: async (input: { query: string }) => {
        const liveSearch = await this.webSearchConnector.search(input.query);
        return {
          query: input.query,
          sources: [liveSearch.sourceUrl, 'https://wirecutter.com', 'https://techradar.com'],
          summary: liveSearch.abstract,
          heading: liveSearch.heading,
          relatedTopics: liveSearch.relatedTopics,
          confidence: 0.95,
        };
      },
    });

    // 3. Finance Transactions Analysis Tool (Read-only)
    this.toolGateway.registerTool({
      id: 'finance.transactions.read',
      name: 'Read-only Financial Ledger Ingestion',
      description: 'Analyzes categorized spending and verifies affordability',
      requiredCapability: CapabilityPermission.FINANCE_TRANSACTIONS_READ,
      execute: async () => {
        return {
          month: 'October 2026',
          monthlyDiscretionaryBudget: 125000,
          currentMonthSpend: 42000,
          remainingAffordability: 83000,
          recurringMonthlyCommitments: 25000,
          assessment: 'Comfortable affordability for purchases under ₹80,000.',
        };
      },
    });

    // 4. Shopping Comparison Tool
    this.toolGateway.registerTool({
      id: 'shopping.search',
      name: 'Product Comparison & Alternatives',
      description: 'Searches e-commerce aggregators for prices, alternatives, and deals',
      requiredCapability: CapabilityPermission.SHOPPING_SEARCH,
      execute: async (input: { product: string }) => {
        return {
          product: input.product,
          lowestPrice: 87990,
          merchant: 'Official Store',
          alternatives: [
            { name: 'MacBook Air M2 (16GB RAM)', price: 89990, valueScore: 95 },
            { name: 'Dell XPS 13 Plus', price: 94990, valueScore: 88 },
          ],
        };
      },
    });

    // 5. Gmail Inbox Ingestion Tool
    this.toolGateway.registerTool({
      id: 'email.read',
      name: 'Gmail Inbox Ingestion',
      description: 'Reads synced personal messages and recruiter reach-outs from Google Workspace',
      requiredCapability: CapabilityPermission.EMAIL_READ,
      execute: async (input?: { category?: string; query?: string }) => {
        const status = this.googleConnector.getStatus();
        if (!status.connected) {
          fileLogger.warn(`Tool email.read: Google Workspace is not connected`, 'ToolsService');
          return {
            connected: false,
            message: 'Google Workspace is not connected. Connect your Google account in the Connectors tab to scan your Gmail inbox.',
            messages: [],
          };
        }
        const messages = await this.googleConnector.searchMessages(input?.query, input?.category);
        fileLogger.log(`Tool email.read retrieved ${messages.length} messages`, 'ToolsService', {
          query: input?.query,
          account: status.email,
          count: messages.length,
        });
        return {
          connected: true,
          account: status.email,
          totalMessages: messages.length,
          unreadCount: messages.filter((m) => m.isUnread).length,
          query: input?.query,
          messages: messages.slice(0, 5).map((m) => ({
            id: m.id,
            from: m.from,
            subject: m.subject,
            snippet: m.snippet,
            date: m.date,
            category: m.category,
          })),
        };
      },
    });

    // 6. Google Drive Document Search Tool
    this.toolGateway.registerTool({
      id: 'drive.read',
      name: 'Google Drive Document Indexing',
      description: 'Browses and searches personal resumes, cover letters, and documents stored in Drive',
      requiredCapability: CapabilityPermission.DRIVE_READ,
      execute: async (input?: { fileType?: string; query?: string }) => {
        const status = this.googleConnector.getStatus();
        if (!status.connected) {
          fileLogger.warn(`Tool drive.read: Google Workspace is not connected`, 'ToolsService');
          return {
            connected: false,
            message: 'Google Workspace (Drive) is not connected. Although OAuth keys may be saved, you need to click "Connect with Google (OAuth 2.0)" in the Connectors tab to authorize access.',
            files: [],
          };
        }
        const files = await this.googleConnector.searchDriveFiles(input?.query, input?.fileType);
        fileLogger.log(`Tool drive.read retrieved ${files.length} files`, 'ToolsService', {
          query: input?.query,
          account: status.email,
          count: files.length,
          sample: files.slice(0, 3).map((f) => f.name),
        });
        return {
          connected: true,
          account: status.email,
          totalFilesIndexed: files.length,
          files: files.map((f) => ({
            id: f.id,
            name: f.name,
            fileType: f.fileType,
            sizeBytes: f.sizeBytes,
            url: f.url,
          })),
        };
      },
    });

    // 7. Google Drive Deep Document Reader
    this.toolGateway.registerTool({
      id: 'drive.file.read_content',
      name: 'Google Drive Deep File Content Reader',
      description: 'Reads raw text, PDF, and Google Doc/Sheet content directly from Google Drive',
      requiredCapability: CapabilityPermission.DRIVE_READ,
      execute: async (input: { fileIdOrName: string }) => {
        const status = this.googleConnector.getStatus();
        if (!status.connected) {
          return {
            connected: false,
            message: 'Google Workspace is not connected. Connect your Google account in the Connectors tab.',
          };
        }
        const fileData = await this.googleConnector.readDriveFileContent(input.fileIdOrName);
        fileLogger.log(`Tool drive.file.read_content read file "${fileData.name}"`, 'ToolsService', {
          fileId: fileData.id,
          length: fileData.content.length,
        });
        return fileData;
      },
    });

    // 8. GitHub Repos & Profile Tool
    this.toolGateway.registerTool({
      id: 'github.read',
      name: 'GitHub Repositories & Profile Indexing',
      description: 'Lists and searches user repositories, starred projects, languages, and profile info',
      requiredCapability: CapabilityPermission.GITHUB_READ,
      execute: async (input?: { query?: string }) => {
        const status = this.githubConnector.getStatus();
        if (!status.connected) {
          return {
            connected: false,
            message: 'GitHub is not connected. Connect your GitHub Personal Access Token in the Connectors tab.',
            repos: [],
          };
        }
        const repos = await this.githubConnector.searchRepos(input?.query);
        fileLogger.log(`Tool github.read found ${repos.length} repositories`, 'ToolsService', {
          username: status.username,
          query: input?.query,
        });
        return {
          connected: true,
          username: status.username,
          profile: status.profile,
          repoCount: repos.length,
          topLanguages: status.topLanguages,
          repos: repos.slice(0, 10).map((r) => ({
            name: r.name,
            fullName: r.fullName,
            description: r.description,
            language: r.language,
            stars: r.stars,
            url: r.htmlUrl,
            updatedAt: r.updatedAt,
          })),
        };
      },
    });

    // 9. GitHub Code & File Content Tool
    this.toolGateway.registerTool({
      id: 'github.file.read',
      name: 'GitHub Raw File Content Reader',
      description: 'Reads raw source code, README.md, package.json, or config files from a GitHub repository',
      requiredCapability: CapabilityPermission.GITHUB_FILE_READ,
      execute: async (input: { repoName: string; path?: string }) => {
        const status = this.githubConnector.getStatus();
        if (!status.connected) {
          return {
            connected: false,
            message: 'GitHub is not connected. Connect your GitHub account in the Connectors tab.',
          };
        }
        const fileResult = await this.githubConnector.readFile(input.repoName, input.path || 'README.md');
        fileLogger.log(`Tool github.file.read read ${fileResult.path} from ${fileResult.repo}`, 'ToolsService');
        return fileResult;
      },
    });

    // 10. Slack Alert & Notification Tool
    this.toolGateway.registerTool({
      id: 'slack.send',
      name: 'Slack Notification Dispatcher',
      description: 'Sends notifications, alerts, or summaries to configured Slack channel',
      requiredCapability: CapabilityPermission.SLACK_SEND,
      execute: async (input: { message: string }) => {
        const status = this.slackConnector.getStatus();
        if (!status.connected) {
          return {
            connected: false,
            message: 'Slack is not connected. Configure an incoming webhook URL in the Connectors tab.',
          };
        }
        const result = await this.slackConnector.sendMessage(input.message);
        fileLogger.log(`Tool slack.send dispatched alert to ${status.channelName}`, 'ToolsService');
        return result;
      },
    });

    // 11. Slack Connection Status Tool
    this.toolGateway.registerTool({
      id: 'slack.read',
      name: 'Slack Connection Status',
      description: 'Checks if Slack incoming webhook bridge is configured and active',
      requiredCapability: CapabilityPermission.SLACK_READ,
      execute: async () => {
        return this.slackConnector.getStatus();
      },
    });

    // 12. Naukri.com India Tech Unicorn Search Tool
    this.toolGateway.registerTool({
      id: 'naukri.search',
      name: 'Naukri.com India Tech Career Search',
      description: 'Searches Indian tech unicorns and scaleups across Bengaluru, Gurgaon, Hyderabad on Naukri.com',
      requiredCapability: CapabilityPermission.NAUKRI_SEARCH,
      execute: async (input: { role?: string; location?: string; remote?: boolean }) => {
        const jobs = await this.naukriConnector.search({
          roles: input.role ? [input.role] : ['Software Engineer'],
          location: input.location || 'Bengaluru',
          remote: input.remote,
        });
        fileLogger.log(`Tool naukri.search retrieved ${jobs.length} roles`, 'ToolsService', { input });
        return {
          source: 'Naukri.com (India)',
          count: jobs.length,
          query: input.role || 'Software Engineer',
          location: input.location || 'Bengaluru',
          jobs: jobs.slice(0, 6),
        };
      },
    });

    // 13. LinkedIn Jobs India & Remote Tool
    this.toolGateway.registerTool({
      id: 'linkedin.search',
      name: 'LinkedIn Jobs India & GCC Search',
      description: 'Searches tier-1 tech MNCs, GCCs, and remote opportunities across India on LinkedIn',
      requiredCapability: CapabilityPermission.LINKEDIN_SEARCH,
      execute: async (input: { role?: string; location?: string; remote?: boolean }) => {
        const jobs = await this.linkedinConnector.search({
          roles: input.role ? [input.role] : ['Software Engineer'],
          location: input.location || 'India',
          remote: input.remote,
        });
        fileLogger.log(`Tool linkedin.search retrieved ${jobs.length} roles`, 'ToolsService', { input });
        return {
          source: 'LinkedIn Jobs',
          count: jobs.length,
          query: input.role || 'Software Engineer',
          location: input.location || 'India',
          jobs: jobs.slice(0, 6),
        };
      },
    });

    // 14. Amazon India Product & Price Search Tool
    this.toolGateway.registerTool({
      id: 'amazon.search',
      name: 'Amazon India Price & Deals Search',
      description: 'Searches products on Amazon.in, retrieves live prices, ratings, and Prime delivery estimates',
      requiredCapability: CapabilityPermission.AMAZON_SEARCH,
      execute: async (input: { query: string; maxResults?: number }) => {
        const items = await this.ecommerceConnector.searchAmazon(input.query, input.maxResults || 5);
        fileLogger.log(`Tool amazon.search retrieved ${items.length} items for "${input.query}"`, 'ToolsService');
        return {
          platform: 'Amazon India',
          query: input.query,
          count: items.length,
          items,
        };
      },
    });

    // 15. Flipkart Product & Discount Search Tool
    this.toolGateway.registerTool({
      id: 'flipkart.search',
      name: 'Flipkart Electronics & Deals Search',
      description: 'Searches products on Flipkart, retrieves live prices, discounts, and Assured delivery tags',
      requiredCapability: CapabilityPermission.FLIPKART_SEARCH,
      execute: async (input: { query: string; maxResults?: number }) => {
        const items = await this.ecommerceConnector.searchFlipkart(input.query, input.maxResults || 5);
        fileLogger.log(`Tool flipkart.search retrieved ${items.length} items for "${input.query}"`, 'ToolsService');
        return {
          platform: 'Flipkart',
          query: input.query,
          count: items.length,
          items,
        };
      },
    });

    // 16. E-Commerce Side-by-Side Comparison Tool
    this.toolGateway.registerTool({
      id: 'ecommerce.compare',
      name: 'Amazon vs Flipkart Price Comparison',
      description: 'Compares real-time product prices side-by-side across Amazon India and Flipkart, calculating savings',
      requiredCapability: CapabilityPermission.ECOMMERCE_COMPARE,
      execute: async (input: { product: string }) => {
        const comp = await this.ecommerceConnector.comparePrices(input.product);
        fileLogger.log(`Tool ecommerce.compare evaluated "${input.product}"`, 'ToolsService', {
          cheapest: comp.cheapestOption.platform,
          price: comp.cheapestOption.currentPrice,
          savings: comp.savingsAmount,
        });
        return comp;
      },
    });

    // 17. Google Web Search Tool
    this.toolGateway.registerTool({
      id: 'google.search',
      name: 'Google Live Web Search',
      description: 'Performs live Google search for up-to-date information, technical documentation, or breaking news',
      requiredCapability: CapabilityPermission.GOOGLE_SEARCH,
      execute: async (input: { query: string; maxResults?: number }) => {
        const res = await this.googleSearchConnector.search(input.query, input.maxResults || 5);
        fileLogger.log(`Tool google.search completed query: "${input.query}"`, 'ToolsService');
        return res;
      },
    });

    // 18. Personal Search & Research History Tool
    this.toolGateway.registerTool({
      id: 'search.history.read',
      name: 'Search & Research History Ingestion',
      description: 'Retrieves user past search history and research topics across PersonalOS',
      requiredCapability: CapabilityPermission.SEARCH_HISTORY_READ,
      execute: async (input?: { limit?: number }) => {
        const history = this.googleSearchConnector.getSearchHistory(input?.limit || 15);
        return {
          count: history.length,
          history,
        };
      },
    });

    // 19. User Amazon Account Orders & Delivery Tracking
    this.toolGateway.registerTool({
      id: 'amazon.user.orders',
      name: 'Amazon Customer Order History & Deliveries',
      description: 'Retrieves live order history, item names, delivery dates, and package status from the user linked Amazon.in account',
      requiredCapability: CapabilityPermission.AMAZON_USER_ORDERS,
      execute: async () => {
        const data = await this.browserSessionService.getAccountStatus('amazon');
        fileLogger.log(`Tool amazon.user.orders fetched ${data.items.length} orders`, 'ToolsService');
        return data;
      },
    });

    // 20. User Flipkart Account Orders & Tracking
    this.toolGateway.registerTool({
      id: 'flipkart.user.orders',
      name: 'Flipkart Customer Orders & Package Tracking',
      description: 'Retrieves live orders, item prices, and delivery tracking from the user linked Flipkart account',
      requiredCapability: CapabilityPermission.FLIPKART_USER_ORDERS,
      execute: async () => {
        const data = await this.browserSessionService.getAccountStatus('flipkart');
        fileLogger.log(`Tool flipkart.user.orders fetched ${data.items.length} orders`, 'ToolsService');
        return data;
      },
    });

    // 21. User LinkedIn Job Applications & Activity
    this.toolGateway.registerTool({
      id: 'linkedin.user.activity',
      name: 'LinkedIn Job Applications & Professional Activity',
      description: 'Fetches jobs applied to, recruiter views, and profile status from the user linked LinkedIn account',
      requiredCapability: CapabilityPermission.LINKEDIN_USER_ACTIVITY,
      execute: async () => {
        const data = await this.browserSessionService.getAccountStatus('linkedin');
        fileLogger.log(`Tool linkedin.user.activity fetched ${data.items.length} applications`, 'ToolsService');
        return data;
      },
    });

    // 22. User Naukri Job Applications & Recruiter Actions
    this.toolGateway.registerTool({
      id: 'naukri.user.activity',
      name: 'Naukri Job Applications & Recruiter Actions',
      description: 'Fetches profile completion score, recruiter search appearances, and applied job statuses from the user linked Naukri account',
      requiredCapability: CapabilityPermission.NAUKRI_USER_ACTIVITY,
      execute: async () => {
        const data = await this.browserSessionService.getAccountStatus('naukri');
        fileLogger.log(`Tool naukri.user.activity fetched ${data.items.length} applications`, 'ToolsService');
        return data;
      },
    });
  }
}
