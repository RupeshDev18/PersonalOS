import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConnectorInfo } from '@personal-os/shared';
import { PrismaService } from '../prisma/prisma.service';

export interface SlackStatus {
  connected: boolean;
  webhookConfigured: boolean;
  channelName: string | null;
  lastDispatched: string | null;
}

@Injectable()
export class SlackConnector implements OnModuleInit {
  private readonly logger = new Logger(SlackConnector.name);

  private connected = false;
  private webhookUrl: string | null = null;
  private channelName: string | null = null;
  private lastDispatched: Date | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const config = await this.prisma.connectorConfig.findUnique({
        where: { id: 'connector-slack' },
      });

      if (config && config.isLive && config.details) {
        const d = config.details as any;
        this.connected = true;
        this.webhookUrl = d.webhookUrl || null;
        this.channelName = d.channelName || '#personal-os-alerts';
        this.lastDispatched = d.lastDispatched ? new Date(d.lastDispatched) : null;
        this.logger.log(`Restored Slack Webhook connection (${this.channelName}) from PostgreSQL.`);
      }
    } catch (err) {
      this.logger.warn(`Could not load Slack connector config: ${(err as Error).message}`);
    }
  }

  public getInfo(): ConnectorInfo {
    return {
      id: 'connector-slack',
      name: 'Slack Incoming Webhook Bridge',
      type: 'communication',
      status: this.connected ? 'connected' : 'disconnected',
      isLive: this.connected,
      description:
        'Streams approval requests, high-priority alerts, and morning briefings directly into your team or private Slack channel.',
      rateLimit: '1 msg/sec (Standard Webhook)',
      lastSync: this.lastDispatched?.toISOString() ?? null,
      details: {
        channel: this.channelName,
        webhookConfigured: Boolean(this.webhookUrl),
        instructions: this.connected
          ? undefined
          : 'Create an Incoming Webhook in your Slack workspace (api.slack.com/apps) and paste the URL here.',
      },
    };
  }

  public getStatus(): SlackStatus {
    return {
      connected: this.connected,
      webhookConfigured: Boolean(this.webhookUrl),
      channelName: this.channelName,
      lastDispatched: this.lastDispatched?.toISOString() ?? null,
    };
  }

  public async connect(webhookUrl: string, channelName = '#personal-os-alerts'): Promise<SlackStatus> {
    const cleanUrl = webhookUrl.trim();
    if (!cleanUrl.startsWith('https://hooks.slack.com/')) {
      throw new BadRequestException('Invalid Slack Webhook URL. It must begin with "https://hooks.slack.com/".');
    }

    this.webhookUrl = cleanUrl;
    this.channelName = channelName.trim() || '#personal-os-alerts';
    this.connected = true;

    await this.persist();
    this.logger.log(`Slack Webhook configured for ${this.channelName}`);
    return this.getStatus();
  }

  public async disconnect(): Promise<SlackStatus> {
    this.connected = false;
    this.webhookUrl = null;
    this.channelName = null;
    this.lastDispatched = null;

    await this.persist();
    this.logger.log('Slack connector disconnected.');
    return this.getStatus();
  }

  public async sendMessage(text: string, blocks?: any[]): Promise<{ success: boolean; message: string }> {
    if (!this.connected || !this.webhookUrl) {
      throw new BadRequestException('Slack is not connected. Configure an incoming webhook URL first.');
    }

    try {
      const payload: any = { text };
      if (blocks && blocks.length > 0) {
        payload.blocks = blocks;
      }

      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Slack API error: ${errText}`);
      }

      this.lastDispatched = new Date();
      await this.persist();
      return { success: true, message: `Notification successfully sent to Slack (${this.channelName}).` };
    } catch (err) {
      const msg = (err as Error).message;
      this.logger.error(`Failed sending Slack message: ${msg}`);
      throw new BadRequestException(`Failed sending to Slack: ${msg}`);
    }
  }

  public async testMessage(): Promise<{ success: boolean; message: string }> {
    return this.sendMessage('🔔 *PersonalOS Connection Test*\nYour Chief Ghost agent has successfully established contact with this Slack channel! 🚀');
  }

  private async persist(): Promise<void> {
    try {
      await this.prisma.connectorConfig.upsert({
        where: { id: 'connector-slack' },
        update: {
          name: 'Slack Incoming Webhook Bridge',
          type: 'notifications',
          status: this.connected ? 'connected' : 'disconnected',
          isLive: this.connected,
          details: {
            webhookUrl: this.webhookUrl,
            channelName: this.channelName,
            lastDispatched: this.lastDispatched,
          },
          updatedAt: new Date(),
        },
        create: {
          id: 'connector-slack',
          name: 'Slack Incoming Webhook Bridge',
          type: 'notifications',
          status: this.connected ? 'connected' : 'disconnected',
          isLive: this.connected,
          details: {
            webhookUrl: this.webhookUrl,
            channelName: this.channelName,
            lastDispatched: this.lastDispatched,
          },
        },
      });
    } catch (err) {
      this.logger.warn(`Failed persisting Slack connector: ${(err as Error).message}`);
    }
  }
}
