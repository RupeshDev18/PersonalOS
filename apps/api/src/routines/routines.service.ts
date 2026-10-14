import { Injectable, Logger } from '@nestjs/common';
import { GoogleConnector } from '../connectors/google.connector';
import { NaukriConnector } from '../connectors/naukri.connector';
import { LinkedInConnector } from '../connectors/linkedin.connector';
import { ECommerceConnector } from '../connectors/ecommerce.connector';
import { GoogleSearchConnector } from '../connectors/google-search.connector';
import { SlackConnector } from '../connectors/slack.connector';
import { NotificationsService } from '../notifications/notifications.service';
import { fileLogger } from '../common/file-logger.service';

export interface RoutineExecutionLog {
  id: string;
  timestamp: string;
  status: 'success' | 'failed' | 'running';
  summary: string;
  details?: Record<string, any>;
}

export interface RoutineItem {
  id: string;
  name: string;
  description: string;
  schedule: string;
  cronHint: string;
  enabled: boolean;
  category: 'career' | 'briefing' | 'shopping' | 'research';
  lastRun?: string;
  nextRun?: string;
  lastStatus?: 'success' | 'failed' | 'pending';
  lastSummary?: string;
  logs: RoutineExecutionLog[];
}

@Injectable()
export class RoutinesService {
  private readonly logger = new Logger(RoutinesService.name);
  private routinesByUser: Map<string, Map<string, RoutineItem>> = new Map();

  constructor(
    private readonly googleConnector: GoogleConnector,
    private readonly naukriConnector: NaukriConnector,
    private readonly linkedinConnector: LinkedInConnector,
    private readonly ecommerceConnector: ECommerceConnector,
    private readonly googleSearchConnector: GoogleSearchConnector,
    private readonly slackConnector: SlackConnector,
    private readonly notificationsService: NotificationsService,
  ) {}

  private initializeRoutines(userId: string): Map<string, RoutineItem> {
    const defaultRoutines: RoutineItem[] = [
      {
        id: 'morning-executive-briefing',
        name: 'Morning Executive Briefing',
        description:
          'Manually scans available email, job, and research connectors and returns a briefing.',
        schedule: 'Manual run only',
        cronHint: '0 9 * * *',
        enabled: false,
        category: 'briefing',
        logs: [],
      },
      {
        id: 'job-scout-watcher',
        name: 'Job Scout',
        description:
          'Manually searches configured job sources for engineering openings and can send a Slack alert.',
        schedule: 'Manual run only',
        cronHint: '0 */6 * * *',
        enabled: false,
        category: 'career',
        logs: [],
      },
      {
        id: 'tech-deals-watcher',
        name: 'Amazon & Flipkart Deals Tracker',
        description:
          'Manually compares a sample product across Amazon India and Flipkart and can send a Slack alert.',
        schedule: 'Manual run only',
        cronHint: '0 14 * * *',
        enabled: false,
        category: 'shopping',
        logs: [],
      },
    ];

    const routines = new Map(defaultRoutines.map((routine) => [routine.id, routine]));
    this.routinesByUser.set(userId, routines);
    return routines;
  }

  private forUser(userId: string): Map<string, RoutineItem> {
    return this.routinesByUser.get(userId) ?? this.initializeRoutines(userId);
  }

  public getAll(userId: string): RoutineItem[] {
    return Array.from(this.forUser(userId).values());
  }

  public async runNow(userId: string, id: string): Promise<{ success: boolean; message: string; summary: string }> {
    const routine = this.forUser(userId).get(id);
    if (!routine) throw new Error(`Routine with ID ${id} not found.`);

    this.logger.log(`[Routines] Executing routine on-demand: "${routine.name}"`);
    const logId = `log-${Date.now()}`;
    const startTime = new Date().toISOString();

    try {
      let summary = '';
      if (id === 'morning-executive-briefing') {
        summary = await this.executeMorningBriefing();
      } else if (id === 'job-scout-watcher') {
        summary = await this.executeJobWatcher();
      } else if (id === 'tech-deals-watcher') {
        summary = await this.executeDealsWatcher();
      } else {
        summary = `Executed routine "${routine.name}" successfully.`;
      }

      routine.lastRun = startTime;
      routine.lastStatus = 'success';
      routine.lastSummary = summary;
      routine.logs.unshift({
        id: logId,
        timestamp: startTime,
        status: 'success',
        summary,
      });
      if (routine.logs.length > 20) routine.logs.pop();

      fileLogger.log(`Routine "${routine.name}" completed`, 'RoutinesService', { summary });

      return {
        success: true,
        message: `Routine "${routine.name}" completed successfully.`,
        summary,
      };
    } catch (err: any) {
      const errMsg = `Routine execution failed: ${err.message}`;
      routine.lastRun = startTime;
      routine.lastStatus = 'failed';
      routine.lastSummary = errMsg;
      routine.logs.unshift({
        id: logId,
        timestamp: startTime,
        status: 'failed',
        summary: errMsg,
      });

      this.logger.error(`[Routines] Routine "${routine.name}" failed: ${err.message}`);
      return {
        success: false,
        message: errMsg,
        summary: errMsg,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // Routine Executors
  // ---------------------------------------------------------------------------

  private async executeMorningBriefing(): Promise<string> {
    const [gmailResult, naukriResult, linkedinResult, searchResult] = await Promise.allSettled([
      this.googleConnector.searchMessages('interview OR offer OR update', 'primary'),
      this.naukriConnector.search({ roles: ['Software Engineer'], location: 'Bengaluru' }),
      this.linkedinConnector.search({ roles: ['Software Engineer'], location: 'India' }),
      this.googleSearchConnector.search('tech industry news India remote engineering', 3),
    ]);

    const gmailMessages = gmailResult.status === 'fulfilled' ? gmailResult.value : [];
    const naukriJobs = naukriResult.status === 'fulfilled' ? naukriResult.value : [];
    const linkedinJobs = linkedinResult.status === 'fulfilled' ? linkedinResult.value : [];
    const searchRes = searchResult.status === 'fulfilled' ? searchResult.value : null;
    const unreadEmails = gmailMessages.filter((m) => m.isUnread).length;
    const topRole = naukriJobs[0] || linkedinJobs[0];
    const roleTitle = topRole ? `${topRole.title} at ${topRole.company}` : 'Senior Engineering Roles';

    const briefText = `🌅 *PersonalOS Morning Executive Briefing*\n` +
      `• *Inbox:* ${gmailResult.status === 'fulfilled' ? `${unreadEmails} unread matching messages` : 'Gmail unavailable'}.\n` +
      `• *First job result:* ${topRole ? `${roleTitle} (${topRole.location?.[0] || 'Location not listed'})` : 'No results or job sources unavailable'}.\n` +
      `• *Market research:* ${searchRes?.summary || 'Unavailable'}.`;

    const deliveredTo: string[] = [];
    if (this.slackConnector.getStatus().connected) {
      try {
        await this.slackConnector.sendMessage(briefText);
        deliveredTo.push('Slack');
      } catch {
        // The briefing remains available in the returned result.
      }
    }
    if (this.notificationsService.getStatus().active) {
      try {
        await this.notificationsService.sendNotification(briefText);
        deliveredTo.push('Telegram');
      } catch {
        // The briefing remains available in the returned result.
      }
    }

    return `${briefText.replaceAll('*', '')} ${deliveredTo.length ? `Sent to ${deliveredTo.join(' and ')}.` : 'No notification channel delivered it.'}`;
  }

  private async executeJobWatcher(): Promise<string> {
    const [naukri, linkedin] = await Promise.all([
      this.naukriConnector.search({ roles: ['Backend Engineer', 'Full Stack Developer'], location: 'Bengaluru' }),
      this.linkedinConnector.search({ roles: ['Software Engineer'], location: 'India' }),
    ]);

    const total = naukri.length + linkedin.length;
    const topPicks = [...naukri.slice(0, 2), ...linkedin.slice(0, 2)];
    const pickNames = topPicks.map((j) => `${j.title} @ ${j.company}`).join(', ');

    const alertText = `🎯 *PersonalOS Job Scout Routine*\n` +
      `Found ${total} search results on Naukri and LinkedIn (not deduplicated or scored).\n` +
      `First results:\n${topPicks.map((p) => `• ${p.title} at ${p.company} (${p.location[0]}) - ${p.url}`).join('\n')}`;

    if (this.slackConnector.getStatus().connected) {
      await this.slackConnector.sendMessage(alertText).catch(() => {});
    }

    return `Found ${total} results (not deduplicated or scored). First results: ${pickNames || 'none'}.`;
  }

  private async executeDealsWatcher(): Promise<string> {
    const comp = await this.ecommerceConnector.comparePrices('MacBook Air M2');
    return comp.summary;
  }

}
