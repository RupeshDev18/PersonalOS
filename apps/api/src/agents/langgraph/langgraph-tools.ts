import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { ToolGateway } from '@personal-os/tools';
import { AgentType } from '@personal-os/shared';
import { fileLogger } from '../../common/file-logger.service';

/**
 * Creates LangGraph-compatible structured tools backed by PersonalOS's ToolGateway.
 * Every tool call enforces policy checks, logs audit trails, and returns structured data.
 */
export function createLangGraphTools(gateway: ToolGateway, userId: string, taskId: string) {
  const driveTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: search_drive`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'drive.read',
          { query: input.query },
          { taskId, userId, agentType: AgentType.COMMUNICATION },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to search Google Drive: ${err.message}`;
      }
    },
    {
      name: 'search_drive',
      description:
        'Searches personal documents, folders, PDFs, receipts, or notes in the user connected Google Drive. Returns matching files, folder hierarchies, and download/view URLs.',
      schema: z.object({
        query: z.string().describe('Filename, folder name, or search keyword (e.g. "loan", "001LoanDocument", "resume", "passport")'),
      }),
    },
  );

  const gmailTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: search_gmail`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'email.read',
          { query: input.query, category: input.category || 'all' },
          { taskId, userId, agentType: AgentType.COMMUNICATION },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to search Gmail: ${err.message}`;
      }
    },
    {
      name: 'search_gmail',
      description:
        'Searches and reads synced emails and inbox messages in the user connected Google Workspace (Gmail). Useful for alerts, recruiter emails, confirmations, and newsletters.',
      schema: z.object({
        query: z.string().optional().describe('Search keyword or sender to filter emails (e.g. "interview", "loan", "offer", "receipt")'),
        category: z.string().optional().describe('Email category filter (e.g. "all", "primary", "updates")'),
      }),
    },
  );

  const jobSearchTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: search_jobs`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'jobs.search',
          { query: input.query, remote: input.remote },
          { taskId, userId, agentType: AgentType.JOB },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to search jobs: ${err.message}`;
      }
    },
    {
      name: 'search_jobs',
      description:
        'Searches live verified career openings across Greenhouse job boards (Stripe, Figma, Cloudflare, etc.) tailored to user technical skills.',
      schema: z.object({
        query: z.string().optional().describe('Target job title or tech stack (e.g. "Senior Backend Engineer", "TypeScript", "React")'),
        remote: z.boolean().optional().describe('Whether to filter for remote roles only'),
      }),
    },
  );

  const webSearchTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: search_web`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'research.web.search',
          { query: input.query },
          { taskId, userId, agentType: AgentType.RESEARCH },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed web research: ${err.message}`;
      }
    },
    {
      name: 'search_web',
      description:
        'Performs live web research via DuckDuckGo to look up facts, documentation, product specs, market benchmarks, or news.',
      schema: z.object({
        query: z.string().describe('The research search query'),
      }),
    },
  );

  const financeTool = tool(
    async () => {
      fileLogger.log(`LangGraph invoking tool: check_finance_budget`, 'LangGraphTools', { userId, taskId });
      try {
        const res = await gateway.execute(
          'finance.transactions.read',
          {},
          { taskId, userId, agentType: AgentType.FINANCE },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to inspect financial ledger: ${err.message}`;
      }
    },
    {
      name: 'check_finance_budget',
      description:
        'Inspects monthly discretionary spending, remaining budget, and financial commitments in the read-only ledger. Useful for affordability checks.',
      schema: z.object({}),
    },
  );

  const shoppingTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: compare_shopping_products`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'shopping.search',
          { product: input.product },
          { taskId, userId, agentType: AgentType.SHOPPING },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to compare products: ${err.message}`;
      }
    },
    {
      name: 'compare_shopping_products',
      description:
        'Searches and compares consumer electronics and items for prices, store deals, and verified alternatives.',
      schema: z.object({
        product: z.string().describe('The product name to check (e.g. "MacBook Air M2")'),
      }),
    },
  );

  const readDriveDocTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: read_drive_document`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'drive.file.read_content',
          { fileIdOrName: input.fileIdOrName },
          { taskId, userId, agentType: AgentType.COMMUNICATION },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to read document content: ${err.message}`;
      }
    },
    {
      name: 'read_drive_document',
      description:
        'Reads raw contents, text, or summaries of a Google Drive document, PDF, or Google Doc/Sheet. Use this when the user asks to inspect, read, or summarize what is inside a specific document.',
      schema: z.object({
        fileIdOrName: z.string().describe('File ID or exact filename of the document to inspect (e.g. "claim-form.pdf", "aadhar_card.pdf", "Interview_Strategy_Guide.md")'),
      }),
    },
  );

  const githubReposTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: search_github_repos`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'github.read',
          { query: input.query },
          { taskId, userId, agentType: AgentType.RESEARCH },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to fetch GitHub repositories: ${err.message}`;
      }
    },
    {
      name: 'search_github_repos',
      description:
        'Lists and searches the user connected GitHub repositories, languages, stars, and developer profile.',
      schema: z.object({
        query: z.string().optional().describe('Keyword, repository name, or programming language (e.g. "PersonalOS", "typescript", "react")'),
      }),
    },
  );

  const githubFileTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: read_github_file`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'github.file.read',
          { repoName: input.repoName, path: input.path || 'README.md' },
          { taskId, userId, agentType: AgentType.RESEARCH },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to read GitHub file: ${err.message}`;
      }
    },
    {
      name: 'read_github_file',
      description:
        'Reads raw file content (README.md, package.json, source code) directly from a GitHub repository.',
      schema: z.object({
        repoName: z.string().describe('Name of the repository (e.g. "PersonalOS")'),
        path: z.string().optional().describe('Path to the file to read (default is "README.md")'),
      }),
    },
  );

  const slackAlertTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: send_slack_alert`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'slack.send',
          { message: input.message },
          { taskId, userId, agentType: AgentType.COMMUNICATION },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to dispatch Slack message: ${err.message}`;
      }
    },
    {
      name: 'send_slack_alert',
      description:
        'Dispatches an alert, brief, or notification to the user connected Slack channel.',
      schema: z.object({
        message: z.string().describe('The notification message or summary text to send to Slack'),
      }),
    },
  );

  const naukriTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: search_naukri_jobs`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'naukri.search',
          { role: input.role, location: input.location, remote: input.remote },
          { taskId, userId, agentType: AgentType.JOB },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to search Naukri: ${err.message}`;
      }
    },
    {
      name: 'search_naukri_jobs',
      description:
        'Searches Indian tech unicorn and scaleup career opportunities on Naukri.com (Razorpay, CRED, Swiggy, Zepto, Groww, etc.).',
      schema: z.object({
        role: z.string().optional().describe('Target job title or skill (e.g. "Backend Engineer", "Full Stack Developer", "AI Engineer")'),
        location: z.string().optional().describe('City or region filter (e.g. "Bengaluru", "Hyderabad", "Gurgaon", "Pune", "Remote")'),
        remote: z.boolean().optional().describe('Whether to filter for remote work roles'),
      }),
    },
  );

  const linkedInTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: search_linkedin_jobs`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'linkedin.search',
          { role: input.role, location: input.location, remote: input.remote },
          { taskId, userId, agentType: AgentType.JOB },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to search LinkedIn: ${err.message}`;
      }
    },
    {
      name: 'search_linkedin_jobs',
      description:
        'Searches top MNCs, Global Capability Centers (GCCs), and remote tech roles across India on LinkedIn (Google, Microsoft IDC, Uber, Atlassian).',
      schema: z.object({
        role: z.string().optional().describe('Target role or skill (e.g. "Staff Engineer", "Senior React Developer")'),
        location: z.string().optional().describe('Target location (e.g. "India", "Bengaluru", "Remote")'),
        remote: z.boolean().optional().describe('Whether to filter for remote roles'),
      }),
    },
  );

  const amazonTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: search_amazon_deals`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'amazon.search',
          { query: input.query },
          { taskId, userId, agentType: AgentType.SHOPPING },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to search Amazon: ${err.message}`;
      }
    },
    {
      name: 'search_amazon_deals',
      description:
        'Searches products, real-time prices in INR, ratings, and Prime delivery badges on Amazon India (amazon.in).',
      schema: z.object({
        query: z.string().describe('Product search query (e.g. "MacBook Air M2", "Sony WH-1000XM5", "Mechanical Keyboard")'),
      }),
    },
  );

  const flipkartTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: search_flipkart_deals`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'flipkart.search',
          { query: input.query },
          { taskId, userId, agentType: AgentType.SHOPPING },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to search Flipkart: ${err.message}`;
      }
    },
    {
      name: 'search_flipkart_deals',
      description:
        'Searches electronics, discounts, bank offers, and Assured delivery tags on Flipkart (flipkart.com).',
      schema: z.object({
        query: z.string().describe('Product search query (e.g. "iPhone 15", "Dell XPS 13", "Ergonomic Chair")'),
      }),
    },
  );

  const ecommerceCompareTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: compare_ecommerce_prices`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'ecommerce.compare',
          { product: input.product },
          { taskId, userId, agentType: AgentType.SHOPPING },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to compare ecommerce prices: ${err.message}`;
      }
    },
    {
      name: 'compare_ecommerce_prices',
      description:
        'Performs a side-by-side price comparison between Amazon India and Flipkart for any product or gadget, calculating exact savings in INR.',
      schema: z.object({
        product: z.string().describe('The product name to compare (e.g. "MacBook Air M2 16GB", "Sony XM5 headphones")'),
      }),
    },
  );

  const googleSearchTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: google_web_search`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'google.search',
          { query: input.query },
          { taskId, userId, agentType: AgentType.RESEARCH },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed Google web search: ${err.message}`;
      }
    },
    {
      name: 'google_web_search',
      description:
        'Queries Google Search for live web information, breaking news, market events, and official documentation.',
      schema: z.object({
        query: z.string().describe('Search query for Google'),
      }),
    },
  );

  const searchHistoryTool = tool(
    async (input) => {
      fileLogger.log(`LangGraph invoking tool: get_search_history`, 'LangGraphTools', { input, userId, taskId });
      try {
        const res = await gateway.execute(
          'search.history.read',
          { limit: input.limit },
          { taskId, userId, agentType: AgentType.RESEARCH },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to read search history: ${err.message}`;
      }
    },
    {
      name: 'get_search_history',
      description:
        'Retrieves the user recent search and research history across PersonalOS to recall topics, queries, or past findings.',
      schema: z.object({
        limit: z.number().optional().describe('Maximum number of past search history items to return (default 10)'),
      }),
    },
  );

  const myAmazonOrdersTool = tool(
    async () => {
      fileLogger.log(`LangGraph invoking tool: get_my_amazon_orders`, 'LangGraphTools', { userId, taskId });
      try {
        const res = await gateway.execute(
          'amazon.user.orders',
          {},
          { taskId, userId, agentType: AgentType.SHOPPING },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to fetch Amazon orders: ${err.message}`;
      }
    },
    {
      name: 'get_my_amazon_orders',
      description:
        'Fetches recent customer orders, package delivery dates, item names, and tracking status from the user linked personal Amazon.in account.',
      schema: z.object({}),
    },
  );

  const myFlipkartOrdersTool = tool(
    async () => {
      fileLogger.log(`LangGraph invoking tool: get_my_flipkart_orders`, 'LangGraphTools', { userId, taskId });
      try {
        const res = await gateway.execute(
          'flipkart.user.orders',
          {},
          { taskId, userId, agentType: AgentType.SHOPPING },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to fetch Flipkart orders: ${err.message}`;
      }
    },
    {
      name: 'get_my_flipkart_orders',
      description:
        'Fetches recent customer orders, package delivery status, and purchase history from the user linked personal Flipkart account.',
      schema: z.object({}),
    },
  );

  const myLinkedInActivityTool = tool(
    async () => {
      fileLogger.log(`LangGraph invoking tool: get_my_linkedin_activity`, 'LangGraphTools', { userId, taskId });
      try {
        const res = await gateway.execute(
          'linkedin.user.activity',
          {},
          { taskId, userId, agentType: AgentType.JOB },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to fetch LinkedIn activity: ${err.message}`;
      }
    },
    {
      name: 'get_my_linkedin_activity',
      description:
        'Fetches jobs applied to, recruiter views, and application progress from the user linked personal LinkedIn account.',
      schema: z.object({}),
    },
  );

  const myNaukriActivityTool = tool(
    async () => {
      fileLogger.log(`LangGraph invoking tool: get_my_naukri_activity`, 'LangGraphTools', { userId, taskId });
      try {
        const res = await gateway.execute(
          'naukri.user.activity',
          {},
          { taskId, userId, agentType: AgentType.JOB },
        );
        return typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      } catch (err: any) {
        return `Failed to fetch Naukri activity: ${err.message}`;
      }
    },
    {
      name: 'get_my_naukri_activity',
      description:
        'Fetches profile completion score, recruiter search appearances, and applied job statuses from the user linked personal Naukri account.',
      schema: z.object({}),
    },
  );

  return [
    driveTool,
    readDriveDocTool,
    gmailTool,
    jobSearchTool,
    naukriTool,
    linkedInTool,
    myLinkedInActivityTool,
    myNaukriActivityTool,
    webSearchTool,
    googleSearchTool,
    searchHistoryTool,
    financeTool,
    shoppingTool,
    amazonTool,
    flipkartTool,
    myAmazonOrdersTool,
    myFlipkartOrdersTool,
    ecommerceCompareTool,
    githubReposTool,
    githubFileTool,
    slackAlertTool,
  ];
}
