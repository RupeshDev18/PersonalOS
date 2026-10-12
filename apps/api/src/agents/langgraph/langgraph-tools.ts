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

  return [
    driveTool,
    readDriveDocTool,
    gmailTool,
    jobSearchTool,
    webSearchTool,
    financeTool,
    shoppingTool,
    githubReposTool,
    githubFileTool,
    slackAlertTool,
  ];
}
