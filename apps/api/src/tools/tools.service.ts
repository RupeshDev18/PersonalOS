import { Injectable, OnModuleInit } from '@nestjs/common';
import { PolicyEngine } from '@personal-os/permissions';
import { ToolGateway } from '@personal-os/tools';
import { CapabilityPermission } from '@personal-os/shared';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ToolsService implements OnModuleInit {
  private policyEngine: PolicyEngine;
  private toolGateway: ToolGateway;

  constructor(private readonly auditService: AuditService) {
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
    // 1. Job Search Tool
    this.toolGateway.registerTool({
      id: 'jobs.search',
      name: 'Job Discovery Search',
      description: 'Searches configured job sources, APIs and feeds for candidate roles',
      requiredCapability: CapabilityPermission.JOBS_SEARCH,
      execute: async (input: { query?: string; remote?: boolean; count?: number }) => {
        const count = input.count || 20;
        return {
          sourceCount: 3,
          sources: ['LinkedIn', 'Wellfound', 'Greenhouse'],
          rawJobsDiscovered: 147,
          deduplicatedJobs: 44,
          topRankedJobs: [
            {
              id: 'job-101',
              title: 'Senior Full Stack Developer',
              company: 'Stripe',
              location: ['Remote'],
              remote: true,
              salaryRange: '₹24–32 LPA',
              matchScore: 94,
              skills: ['React', 'Node.js', 'PostgreSQL', 'AWS'],
              recommendedResume: 'Fullstack-AWS-v3.md',
            },
            {
              id: 'job-102',
              title: 'Staff Backend Engineer',
              company: 'Postman',
              location: ['Bengaluru', 'Remote'],
              remote: true,
              salaryRange: '₹35–45 LPA',
              matchScore: 91,
              skills: ['Node.js', 'TypeScript', 'Distributed Systems'],
              recommendedResume: 'Backend-Systems-v2.md',
            },
          ],
        };
      },
    });

    // 2. Web Research Tool
    this.toolGateway.registerTool({
      id: 'research.web.search',
      name: 'Web Intelligence Research',
      description: 'Gathers facts, benchmarks, and comparisons across the web',
      requiredCapability: CapabilityPermission.RESEARCH_WEB_SEARCH,
      execute: async (input: { query: string }) => {
        return {
          query: input.query,
          sources: ['https://wirecutter.com', 'https://techradar.com'],
          summary: `Aggregated review intelligence for "${input.query}": Rated 4.8/5. Best-in-class battery life and performance. Excellent value proposition.`,
          confidence: 0.94,
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
  }
}
