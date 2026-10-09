import { Injectable, Logger, OnModuleInit, OnModuleDestroy, forwardRef, Inject } from '@nestjs/common';
import { ApprovalRequest, ApprovalStatus } from '@personal-os/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ApprovalsService } from '../approvals/approvals.service';

export interface TelegramStatus {
  configured: boolean;
  active: boolean;
  botUsername: string | null;
  chatId: string | null;
  mode: 'polling' | 'webhook' | 'idle';
}

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);

  private botToken: string | null = null;
  private chatId: string | null = null;
  private botUsername: string | null = null;
  private pollingActive = false;
  private pollingOffset = 0;
  private pollingTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => ApprovalsService))
    private readonly approvalsService: ApprovalsService,
  ) {}

  async onModuleInit() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || null;
    this.chatId = process.env.TELEGRAM_CHAT_ID || null;

    try {
      const dbConfig = await this.prisma.connectorConfig.findUnique({
        where: { id: 'connector-telegram' },
      });
      if (dbConfig?.details) {
        const d = dbConfig.details as any;
        if (d.botToken) this.botToken = d.botToken;
        if (d.chatId) this.chatId = d.chatId;
      }
    } catch {
      // fallback
    }

    if (this.botToken) {
      await this.verifyBot();
      this.startPolling();
    } else {
      this.logger.log('Telegram bot not yet configured. Provide TELEGRAM_BOT_TOKEN to enable mobile alerts.');
    }
  }

  onModuleDestroy() {
    this.stopPolling();
  }

  public getStatus(): TelegramStatus {
    return {
      configured: Boolean(this.botToken),
      active: Boolean(this.botToken && this.chatId),
      botUsername: this.botUsername,
      chatId: this.chatId ? `${this.chatId.slice(0, 3)}••••` : null,
      mode: this.pollingActive ? 'polling' : 'idle',
    };
  }

  public async setConfig(botToken: string, chatId?: string): Promise<boolean> {
    this.botToken = botToken.trim();
    if (chatId) this.chatId = chatId.trim();

    const ok = await this.verifyBot();
    if (ok) {
      try {
        await this.prisma.connectorConfig.upsert({
          where: { id: 'connector-telegram' },
          update: {
            name: 'Telegram Bot Bridge',
            type: 'communication',
            status: 'connected',
            isLive: true,
            details: {
              botToken: this.botToken,
              chatId: this.chatId,
              botUsername: this.botUsername,
            },
            updatedAt: new Date(),
          },
          create: {
            id: 'connector-telegram',
            name: 'Telegram Bot Bridge',
            type: 'communication',
            status: 'connected',
            isLive: true,
            details: {
              botToken: this.botToken,
              chatId: this.chatId,
              botUsername: this.botUsername,
            },
          },
        });
      } catch (err) {
        this.logger.warn(`Could not persist Telegram config: ${(err as Error).message}`);
      }

      this.startPolling();
      return true;
    }
    return false;
  }

  private async verifyBot(): Promise<boolean> {
    if (!this.botToken) return false;
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.result) {
          this.botUsername = data.result.username || data.result.first_name;
          this.logger.log(`Telegram Bot verified: @${this.botUsername}`);
          return true;
        }
      }
    } catch (err) {
      this.logger.warn(`Failed verifying Telegram bot: ${(err as Error).message}`);
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Push Notification Dispatcher
  // ---------------------------------------------------------------------------

  public async sendNotification(text: string): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      this.logger.debug(`Telegram notification skipped (not configured): ${text.slice(0, 60)}...`);
      return false;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'HTML',
        }),
      });
      return res.ok;
    } catch (err) {
      this.logger.warn(`Failed sending Telegram notification: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Sends an interactive Approval Request card with 1-Tap Approve/Reject buttons
   */
  public async sendApprovalPrompt(approval: ApprovalRequest): Promise<boolean> {
    if (!this.botToken || !this.chatId) return false;

    const company = (approval.payload as any)?.company || 'Company';
    const role = (approval.payload as any)?.role || 'Target Position';
    const resume = (approval.payload as any)?.resume || 'Custom-Resume.md';

    const text = `🛡️ <b>SAFETY GATE: APPROVAL REQUIRED</b>\n\n` +
      `<b>${approval.title}</b>\n` +
      `${approval.description}\n\n` +
      `🏢 <b>Entity:</b> ${company}\n` +
      `💼 <b>Role:</b> ${role}\n` +
      `📄 <b>Resume:</b> <code>${resume}</code>\n` +
      `🔑 <b>Capability:</b> <code>${approval.capabilityRequired}</code>\n\n` +
      `<i>Tap below to authorize or reject from mobile:</i>`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '✅ Approve Application', callback_data: `app:approve:${approval.id}` },
          { text: '❌ Reject', callback_data: `app:reject:${approval.id}` },
        ],
      ],
    };

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard,
        }),
      });
      return res.ok;
    } catch (err) {
      this.logger.warn(`Failed sending Telegram approval prompt: ${(err as Error).message}`);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Polling & Webhook Update Handlers
  // ---------------------------------------------------------------------------

  public startPolling(): void {
    if (this.pollingActive || !this.botToken) return;
    this.pollingActive = true;
    this.logger.log(`Starting Telegram long-polling listener for @${this.botUsername || 'bot'}...`);
    this.pollLoop();
  }

  public stopPolling(): void {
    this.pollingActive = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async pollLoop(): Promise<void> {
    if (!this.pollingActive || !this.botToken) return;

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.pollingOffset}&timeout=10`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.pollingOffset = update.update_id + 1;
            await this.processUpdate(update);
          }
        }
      }
    } catch {
      // transient network wait
    }

    if (this.pollingActive) {
      this.pollingTimer = setTimeout(() => this.pollLoop(), 1000);
    }
  }

  public async processUpdate(update: any): Promise<void> {
    // 1. Handle Inline Button Clicks (Approve / Reject)
    if (update.callback_query) {
      const cb = update.callback_query;
      const data: string = cb.data || '';
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;

      if (data.startsWith('app:approve:') || data.startsWith('app:reject:')) {
        const parts = data.split(':');
        const decision = parts[1] as 'approve' | 'reject';
        const approvalId = parts[2];

        try {
          const result = await this.approvalsService.decide(
            approvalId,
            decision,
            `Authorized via Telegram 1-tap by operator (${cb.from?.first_name || 'Mobile User'})`,
          );

          // Acknowledge callback query
          await fetch(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: cb.id,
              text: decision === 'approve' ? '✅ Action Authorized!' : '❌ Action Rejected.',
              show_alert: true,
            }),
          });

          // Edit message on Telegram
          const statusText = decision === 'approve'
            ? `✅ <b>APPROVED & EXECUTED</b>\n\n<b>${result.title}</b>\nStatus: <code>${result.status}</code>\nDecided by: <b>${cb.from?.first_name || 'Operator'}</b> via Telegram Mobile\nTimestamp: ${new Date().toLocaleTimeString()}`
            : `❌ <b>REJECTED BY OPERATOR</b>\n\n<b>${result.title}</b>\nEnforced safety policy constraint.\nTimestamp: ${new Date().toLocaleTimeString()}`;

          if (chatId && messageId) {
            await fetch(`https://api.telegram.org/bot${this.botToken}/editMessageText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: statusText,
                parse_mode: 'HTML',
              }),
            });
          }
        } catch (decideErr) {
          await fetch(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callback_query_id: cb.id,
              text: `Notice: ${(decideErr as Error).message}`,
              show_alert: true,
            }),
          });
        }
      }
      return;
    }

    // 2. Handle Text Messages & Commands
    if (update.message?.text) {
      const msg = update.message;
      const text = msg.text.trim();
      const chatId = String(msg.chat.id);

      // Auto-bind chat ID on /start or first message
      if (!this.chatId || text.startsWith('/start')) {
        this.chatId = chatId;
        await this.setConfig(this.botToken!, this.chatId);
      }

      if (text.startsWith('/start')) {
        await this.sendNotification(
          `👋 <b>Welcome to PersonalOS Mobile Bridge!</b>\n\n` +
          `Your Telegram chat ID (<code>${chatId}</code>) is now securely linked.\n` +
          `You will receive real-time notifications for:\n` +
          `• 🛡️ <b>Safety Gate Approvals</b> (1-Tap Approve/Reject)\n` +
          `• 💼 <b>High-match Job Alerts</b>\n` +
          `• 🌅 <b>Morning Executive Briefings</b>\n\n` +
          `Commands: /summary, /approvals, /ping`,
        );
      } else if (text.startsWith('/ping')) {
        await this.sendNotification(`🏓 <b>Pong!</b> PersonalOS daemon active and healthy.`);
      } else if (text.startsWith('/approvals')) {
        const pending = await this.approvalsService.getApprovals(ApprovalStatus.PENDING);
        if (pending.length === 0) {
          await this.sendNotification(`🛡️ <b>Approvals:</b> No pending requests. All systems clear.`);
        } else {
          for (const a of pending.slice(0, 3)) {
            await this.sendApprovalPrompt(a);
          }
        }
      }
    }
  }
}
