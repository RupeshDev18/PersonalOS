import { Injectable, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { GmailMessage, GoogleDriveFile, ConnectorInfo } from '@personal-os/shared';
import { PrismaService } from '../prisma/prisma.service';

export type GoogleAuthMethod = 'oauth_consent' | 'app_password' | 'oauth_token';

export interface GoogleStatus {
  connected: boolean;
  email: string | null;
  authMethod: GoogleAuthMethod | null;
  credentialMasked: string | null;
  lastSync: string | null;
  unreadEmails: number;
  indexedFilesCount: number;
  scopes: string[];
  oauthConfigured: boolean;
}

export interface StoredConnectorDetails {
  email?: string;
  authMethod?: GoogleAuthMethod;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: number;
  credentialMasked?: string;
  scopes?: string[];
  unreadEmails?: number;
  indexedFilesCount?: number;
}

@Injectable()
export class GoogleConnector implements OnModuleInit {
  private readonly logger = new Logger(GoogleConnector.name);

  private connected = false;
  private email: string | null = null;
  private authMethod: GoogleAuthMethod | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;
  private credentialMasked: string | null = null;
  private lastSync: Date | null = null;

  private messages: GmailMessage[] = [];
  private driveFiles: GoogleDriveFile[] = [];

  private customClientId: string | null = null;
  private customClientSecret: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // 1. Check for stored custom OAuth keys in DB
      const oauthKeys = await this.prisma.connectorConfig.findUnique({
        where: { id: 'connector-google-oauth-keys' },
      });
      if (oauthKeys && oauthKeys.details) {
        const d = oauthKeys.details as any;
        this.customClientId = d.clientId || null;
        this.customClientSecret = d.clientSecret || null;
      }

      // 2. Check for active user session
      const config = await this.prisma.connectorConfig.findUnique({
        where: { id: 'connector-google-workspace' },
      });

      if (config && config.isLive && config.details) {
        const d = config.details as StoredConnectorDetails;
        this.connected = true;
        this.email = d.email || null;
        this.authMethod = d.authMethod || 'oauth_consent';
        this.accessToken = d.accessToken || null;
        this.refreshToken = d.refreshToken || null;
        this.tokenExpiry = d.tokenExpiry || null;
        this.credentialMasked = d.credentialMasked || 'OAuth 2.0 (configured)';
        this.lastSync = config.updatedAt;

        this.logger.log(`Restored Google Workspace connection for ${this.email} from PostgreSQL.`);
        // Run background initial sync
        this.sync().catch((e) => this.logger.warn(`Initial sync error: ${e.message}`));
      }
    } catch (err) {
      this.logger.warn(`Could not load Google connector config from PostgreSQL: ${(err as Error).message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // OAuth 2.0 Flow Helpers
  // ---------------------------------------------------------------------------

  public getClientId(): string | null {
    return this.customClientId || process.env.GOOGLE_CLIENT_ID || null;
  }

  public getClientSecret(): string | null {
    return this.customClientSecret || process.env.GOOGLE_CLIENT_SECRET || null;
  }

  public isOAuthConfigured(): boolean {
    return Boolean(this.getClientId() && this.getClientSecret());
  }

  public async saveOAuthCredentials(clientId: string, clientSecret: string): Promise<{ success: boolean; message: string }> {
    if (!clientId.trim() || !clientSecret.trim()) {
      throw new BadRequestException('Both Client ID and Client Secret are required.');
    }
    this.customClientId = clientId.trim();
    this.customClientSecret = clientSecret.trim();

    await this.prisma.connectorConfig.upsert({
      where: { id: 'connector-google-oauth-keys' },
      update: {
        name: 'Google OAuth Client Keys',
        type: 'credentials',
        status: 'configured',
        isLive: true,
        details: {
          clientId: this.customClientId,
          clientSecret: this.customClientSecret,
          maskedId: `${this.customClientId.slice(0, 12)}...`,
        },
        updatedAt: new Date(),
      },
      create: {
        id: 'connector-google-oauth-keys',
        name: 'Google OAuth Client Keys',
        type: 'credentials',
        status: 'configured',
        isLive: true,
        details: {
          clientId: this.customClientId,
          clientSecret: this.customClientSecret,
          maskedId: `${this.customClientId.slice(0, 12)}...`,
        },
      },
    });

    return {
      success: true,
      message: 'Google Cloud OAuth 2.0 Client credentials saved. You can now connect with Google.',
    };
  }

  public getAuthUrl(redirectUri?: string): { authUrl: string | null; configured: boolean; message?: string } {
    const clientId = this.getClientId();
    if (!clientId) {
      return {
        authUrl: null,
        configured: false,
        message: 'Google Cloud Client ID and Secret are not yet configured. Please enter them in the setup modal below or provide GOOGLE_CLIENT_ID in .env.',
      };
    }

    const uri = redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/connectors/google/callback';
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: uri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      include_granted_scopes: 'true',
    });

    return {
      authUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      configured: true,
    };
  }

  public async handleOAuthCallback(code: string, redirectUri?: string): Promise<GoogleStatus> {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const uri = redirectUri || process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/connectors/google/callback';

    if (!clientId || !clientSecret) {
      throw new BadRequestException('Google OAuth client credentials not configured on the server.');
    }

    // Exchange auth code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: uri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      this.logger.error(`OAuth token exchange failed: ${errBody}`);
      throw new BadRequestException(`Failed to exchange Google OAuth authorization code: ${errBody}`);
    }

    const tokenData = await tokenRes.json();
    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token || this.refreshToken;
    this.tokenExpiry = Date.now() + (tokenData.expires_in || 3600) * 1000;
    this.authMethod = 'oauth_token';

    // Fetch user profile info
    let userEmail = 'user@gmail.com';
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        userEmail = userData.email || userEmail;
      }
    } catch (e) {
      this.logger.warn(`Failed fetching Google userinfo: ${(e as Error).message}`);
    }

    this.connected = true;
    this.email = userEmail.toLowerCase();
    this.credentialMasked = `OAuth 2.0 (${this.email})`;
    this.lastSync = new Date();

    await this.persistState();
    await this.sync();

    return this.getStatus();
  }

  private async refreshAccessTokenIfNeeded(): Promise<boolean> {
    if (!this.refreshToken) return false;
    // Check if expires in less than 5 minutes
    if (this.tokenExpiry && Date.now() < this.tokenExpiry - 300_000) {
      return true; // Still fresh
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return false;

    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: this.refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
        await this.persistState();
        this.logger.log(`Refreshed Google access token for ${this.email}`);
        return true;
      }
    } catch (e) {
      this.logger.warn(`Failed to refresh Google token: ${(e as Error).message}`);
    }
    return false;
  }

  private async persistState(): Promise<void> {
    try {
      const details: StoredConnectorDetails = {
        email: this.email || undefined,
        authMethod: this.authMethod || undefined,
        accessToken: this.accessToken || undefined,
        refreshToken: this.refreshToken || undefined,
        tokenExpiry: this.tokenExpiry || undefined,
        credentialMasked: this.credentialMasked || undefined,
        scopes: this.getStatus().scopes,
        unreadEmails: this.messages.filter((m) => m.isUnread).length,
        indexedFilesCount: this.driveFiles.length,
      };

      await this.prisma.connectorConfig.upsert({
        where: { id: 'connector-google-workspace' },
        update: {
          name: 'Google Workspace',
          type: 'personal_context',
          status: this.connected ? 'connected' : 'disconnected',
          isLive: this.connected,
          details: details as any,
          updatedAt: new Date(),
        },
        create: {
          id: 'connector-google-workspace',
          name: 'Google Workspace',
          type: 'personal_context',
          status: this.connected ? 'connected' : 'disconnected',
          isLive: this.connected,
          details: details as any,
        },
      });
    } catch (err) {
      this.logger.warn(`Error persisting connector config to PostgreSQL: ${(err as Error).message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // ConnectorInfo — consumed by ConnectorRegistryService
  // ---------------------------------------------------------------------------

  public getInfo(): ConnectorInfo {
    return {
      id: 'connector-google-workspace',
      name: 'Google Workspace',
      type: 'personal_context',
      status: this.connected ? 'connected' : 'disconnected',
      isLive: this.connected,
      description:
        'Gmail inbox + Google Drive. Connect with your Google account to let the Chief Agent read your emails and Drive documents.',
      rateLimit: 'OAuth 2.0 (250 req/sec)',
      lastSync: this.lastSync?.toISOString() ?? null,
      details: {
        account: this.email,
        unreadEmails: this.messages.filter((m) => m.isUnread).length,
        indexedFiles: this.driveFiles.length,
        oauthConfigured: this.isOAuthConfigured(),
        scopes: this.connected
          ? ['gmail.readonly', 'gmail.compose', 'drive.readonly']
          : [],
        instructions: this.connected
          ? undefined
          : 'Authorize Google Workspace to sync live Gmail messages and Google Drive resumes.',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  public getStatus(): GoogleStatus {
    return {
      connected: this.connected,
      email: this.email,
      authMethod: this.authMethod,
      credentialMasked: this.credentialMasked,
      lastSync: this.lastSync?.toISOString() ?? null,
      unreadEmails: this.messages.filter((m) => m.isUnread).length,
      indexedFilesCount: this.driveFiles.length,
      oauthConfigured: this.isOAuthConfigured(),
      scopes: this.connected
        ? [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/drive.readonly',
          ]
        : [],
    };
  }

  // ---------------------------------------------------------------------------
  // Connect / disconnect
  // ---------------------------------------------------------------------------

  public async connect(
    email: string,
    authMethod: GoogleAuthMethod = 'oauth_consent',
    credential?: string,
  ): Promise<GoogleStatus> {
    if (!email?.includes('@')) {
      throw new BadRequestException('Please provide a valid Gmail address.');
    }
    if (authMethod !== 'oauth_consent' && (!credential || credential.trim().length < 6)) {
      const hint =
        authMethod === 'app_password'
          ? 'Provide the 16-character Google App Password from myaccount.google.com/apppasswords.'
          : 'Provide a valid Google OAuth 2.0 access token.';
      throw new BadRequestException(hint);
    }

    this.connected = true;
    this.email = email.trim().toLowerCase();
    this.authMethod = authMethod;

    if (authMethod === 'oauth_token' && credential) {
      this.accessToken = credential.trim();
      this.credentialMasked = `${this.accessToken.slice(0, 4)}••••••${this.accessToken.slice(-4)}`;
    } else if (authMethod === 'app_password' && credential) {
      this.credentialMasked = `App Password (${credential.trim().slice(0, 4)}••••)`;
    } else {
      this.credentialMasked = 'OAuth 2.0 (consented scopes)';
    }

    this.lastSync = new Date();
    await this.persistState();
    await this.sync();

    this.logger.log(`Google Workspace connected: ${this.email} via ${authMethod}`);
    return this.getStatus();
  }

  public async disconnect(): Promise<GoogleStatus> {
    this.connected = false;
    this.email = null;
    this.authMethod = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.credentialMasked = null;
    this.lastSync = null;
    this.messages = [];
    this.driveFiles = [];

    await this.persistState();
    this.logger.log('Google Workspace disconnected.');
    return this.getStatus();
  }

  // ---------------------------------------------------------------------------
  // Sync: Live Google API Calls + Categorization
  // ---------------------------------------------------------------------------

  public async sync(): Promise<GoogleStatus> {
    if (!this.connected) return this.getStatus();

    let fetchedRealGmail = false;
    let fetchedRealDrive = false;

    // 1. Try Live Gmail API if access token exists
    if (this.accessToken) {
      await this.refreshAccessTokenIfNeeded();
      try {
        const gmailRes = await fetch(
          'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=15',
          {
            headers: { Authorization: `Bearer ${this.accessToken}` },
          },
        );

        if (gmailRes.ok) {
          const listData = await gmailRes.json();
          const messageIds: string[] = (listData.messages || []).map((m: any) => m.id);

          const detailedMessages: GmailMessage[] = [];
          for (const msgId of messageIds.slice(0, 10)) {
            try {
              const itemRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata`,
                {
                  headers: { Authorization: `Bearer ${this.accessToken}` },
                },
              );
              if (itemRes.ok) {
                const item = await itemRes.json();
                const headers: Array<{ name: string; value: string }> = item.payload?.headers || [];
                const getHeader = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

                const fromRaw = getHeader('From');
                const subject = getHeader('Subject') || '(No Subject)';
                const dateRaw = getHeader('Date') || new Date().toISOString();
                const isUnread = (item.labelIds || []).includes('UNREAD');

                // Categorize intelligently
                const category = this.categorizeEmail(fromRaw, subject, item.snippet || '');

                detailedMessages.push({
                  id: item.id,
                  threadId: item.threadId,
                  from: fromRaw,
                  fromName: fromRaw.split('<')[0].replace(/"/g, '').trim() || fromRaw,
                  to: getHeader('To') || this.email || '',
                  subject,
                  snippet: item.snippet || '',
                  bodyText: item.snippet || '',
                  date: new Date(dateRaw).toISOString(),
                  isUnread,
                  category,
                  company: this.extractCompanyFromEmail(fromRaw),
                });
              }
            } catch (err) {
              // skip single item failure
            }
          }

          if (detailedMessages.length > 0) {
            this.messages = detailedMessages;
            fetchedRealGmail = true;
            this.logger.log(`Live synced ${detailedMessages.length} Gmail messages from Google REST API.`);
          }
        }
      } catch (err) {
        this.logger.warn(`Gmail API fetch error: ${(err as Error).message}`);
      }

      // 2. Try Live Drive API
      try {
        const driveRes = await fetch(
          'https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,modifiedTime,size,webViewLink)',
          {
            headers: { Authorization: `Bearer ${this.accessToken}` },
          },
        );

        if (driveRes.ok) {
          const driveData = await driveRes.json();
          const files = driveData.files || [];
          this.driveFiles = files.map((f: any) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            sizeBytes: Number(f.size || 0),
            lastModified: f.modifiedTime || new Date().toISOString(),
            fileType: this.classifyDriveFile(f.name, f.mimeType),
            url: f.webViewLink,
            contentMarkdown: `# ${f.name}\n\nGoogle Drive synchronized document (ID: ${f.id}).`,
          }));
          fetchedRealDrive = true;
          this.logger.log(`Live synced ${this.driveFiles.length} files from Google Drive REST API.`);
        }
      } catch (err) {
        this.logger.warn(`Drive API fetch error: ${(err as Error).message}`);
      }
    }

    this.lastSync = new Date();
    await this.persistState();
    return this.getStatus();
  }

  // ---------------------------------------------------------------------------
  // Data accessors
  // ---------------------------------------------------------------------------

  public async searchMessages(query?: string, filterCategory?: string): Promise<GmailMessage[]> {
    if (!this.connected) return [];

    let liveResults: GmailMessage[] = [];
    if (this.accessToken && query && query.trim()) {
      await this.refreshAccessTokenIfNeeded();
      try {
        const stopWords = new Set(['from', 'my', 'mail', 'email', 'can', 'you', 'tell', 'me', 'how', 'much', 'i', 'the', 'a', 'an', 'what', 'is', 'did', 'for', 'in', 'and', 'to']);
        const tokens = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w && !stopWords.has(w));
        const qParam = tokens.length > 0 ? tokens.join(' ') : query.trim();

        const searchUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(qParam)}&maxResults=10`;
        const res = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${this.accessToken}` },
        });

        if (res.ok) {
          const listData = await res.json();
          const messageIds: string[] = (listData.messages || []).map((m: any) => m.id);

          for (const msgId of messageIds.slice(0, 5)) {
            try {
              const itemRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata`,
                { headers: { Authorization: `Bearer ${this.accessToken}` } },
              );
              if (itemRes.ok) {
                const item = await itemRes.json();
                const headers: Array<{ name: string; value: string }> = item.payload?.headers || [];
                const getHeader = (name: string) => headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

                const fromRaw = getHeader('From');
                const subject = getHeader('Subject') || '(No Subject)';
                const dateRaw = getHeader('Date') || new Date().toISOString();
                const isUnread = (item.labelIds || []).includes('UNREAD');

                liveResults.push({
                  id: item.id,
                  threadId: item.threadId,
                  from: fromRaw,
                  fromName: fromRaw.split('<')[0].replace(/"/g, '').trim() || fromRaw,
                  to: getHeader('To') || this.email || '',
                  subject,
                  snippet: item.snippet || '',
                  bodyText: item.snippet || '',
                  date: new Date(dateRaw).toISOString(),
                  isUnread,
                  category: this.categorizeEmail(fromRaw, subject, item.snippet || ''),
                  company: this.extractCompanyFromEmail(fromRaw),
                });
              }
            } catch {
              // skip single message error
            }
          }
        }
      } catch (e) {
        this.logger.warn(`searchMessages Gmail API error: ${(e as Error).message}`);
      }
    }

    if (liveResults.length > 0) {
      return liveResults;
    }

    let results = this.getMessages(filterCategory);
    if (query && query.trim()) {
      const qTokens = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
      if (qTokens.length > 0) {
        const matched = results.filter((m) => {
          const text = `${m.subject} ${m.snippet} ${m.from}`.toLowerCase();
          return qTokens.some((t) => text.includes(t));
        });
        if (matched.length > 0) return matched;
      }
    }
    return results;
  }

  public getMessages(filterCategory?: string): GmailMessage[] {
    if (!this.connected) return [];
    return filterCategory
      ? this.messages.filter((m) => m.category === filterCategory)
      : this.messages;
  }

  public getDriveFiles(fileTypeFilter?: string): GoogleDriveFile[] {
    if (!this.connected) return [];
    return fileTypeFilter
      ? this.driveFiles.filter((f) => f.fileType === fileTypeFilter)
      : this.driveFiles;
  }

  public getDriveFileById(fileId: string): GoogleDriveFile | undefined {
    return this.driveFiles.find((f) => f.id === fileId);
  }

  // ---------------------------------------------------------------------------
  // Classification Helpers
  // ---------------------------------------------------------------------------

  private categorizeEmail(from: string, subject: string, snippet: string): 'primary' | 'recruiters' | 'updates' | 'finance' {
    const text = `${from} ${subject} ${snippet}`.toLowerCase();
    if (text.match(/recruiter|interview|talent|greenhouse|lever|ashby|application|applied|offer|hiring|job/)) {
      return 'recruiters';
    }
    if (text.match(/hdfc|icici|sbi|invoice|receipt|statement|bank|salary|payment|bill|razorpay|stripe/)) {
      return 'finance';
    }
    if (text.match(/security alert|update|terms|github|newsletter|digest|notification/)) {
      return 'updates';
    }
    return 'primary';
  }

  private classifyDriveFile(name: string, mimeType: string): GoogleDriveFile['fileType'] {
    const lower = name.toLowerCase();
    if (lower.includes('resume') || lower.includes('cv')) return 'resume';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('spreadsheet') || mimeType.includes('csv') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('document') || mimeType.includes('word') || lower.endsWith('.md')) return 'document';
    return 'notes';
  }

  private extractCompanyFromEmail(from: string): string | undefined {
    const domainMatch = from.match(/@([a-zA-Z0-9.-]+)/);
    if (!domainMatch) return undefined;
    const domain = domainMatch[1].toLowerCase();
    if (domain.includes('stripe')) return 'Stripe';
    if (domain.includes('greenhouse')) return 'Greenhouse ATS';
    if (domain.includes('cloudflare')) return 'Cloudflare';
    if (domain.includes('figma')) return 'Figma';
    if (domain.includes('google')) return 'Google';
    return undefined;
  }
}
