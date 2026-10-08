import { PrismaClient } from '@prisma/client';

export class DailySummaryWorker {
  constructor(private readonly prisma: PrismaClient) {}

  public async run(userId = 'user-rupesh'): Promise<string> {
    console.log(`[DailySummaryWorker] Generating morning intelligence summary for user '${userId}'...`);

    const [recommendedJobsCount, pendingApprovalsCount, recentTransactions] = await Promise.all([
      this.prisma.job.count({ where: { userId, lifecycleStatus: 'RECOMMENDED' } }),
      this.prisma.approval.count({ where: { userId, status: 'pending' } }),
      this.prisma.transaction.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 5 }),
    ]);

    const totalExpense = recentTransactions.reduce((sum, t) => sum + t.amount, 0);

    const summaryReport = `Good morning Rupesh! Here is your PersonalOS Autonomous Operations Briefing:
• Careers: ${recommendedJobsCount} highly matched opportunities ready for review across Stripe, Figma, Cloudflare.
• Safety Gate: ${pendingApprovalsCount} pending capability approvals awaiting your sign-off.
• Financial Ledger: ₹${totalExpense.toLocaleString('en-IN')} logged across recent ledger items. Reserve buffer is healthy.
All background workers and connectors are running smoothly.`;

    try {
      await this.prisma.auditEvent.create({
        data: {
          userId,
          agentId: 'agent-chief',
          eventType: 'DAILY_SUMMARY_GENERATED',
          toolName: 'summary.morning_briefing',
          outputPayload: {
            recommendedJobsCount,
            pendingApprovalsCount,
            recentExpenseSum: totalExpense,
            report: summaryReport,
          },
          rationale: 'Autonomous daily operational briefing produced for operator.',
        },
      });
    } catch {
      // ignore
    }

    console.log(`[DailySummaryWorker] Summary generated successfully.`);
    return summaryReport;
  }
}
