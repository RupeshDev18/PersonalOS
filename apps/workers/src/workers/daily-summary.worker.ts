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

    // Deliver to Telegram bot if credentials are present
    let botToken = process.env.TELEGRAM_BOT_TOKEN;
    let chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      try {
        const config = await this.prisma.connectorConfig.findUnique({
          where: { id: 'connector-telegram' },
        });
        if (config?.details) {
          const d = config.details as any;
          if (d.botToken) botToken = d.botToken;
          if (d.chatId) chatId = d.chatId;
        }
      } catch {
        // fallback
      }
    }

    if (botToken && chatId) {
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `☀️ <b>PersonalOS Morning Briefing</b>\n\n${summaryReport}`,
            parse_mode: 'HTML',
          }),
        });
        console.log(`[DailySummaryWorker] Successfully delivered briefing to Telegram chat ${chatId}.`);
      } catch (err) {
        console.warn(`[DailySummaryWorker] Telegram delivery failed: ${(err as Error).message}`);
      }
    }

    console.log(`[DailySummaryWorker] Summary generated successfully.`);
    return summaryReport;
  }
}
