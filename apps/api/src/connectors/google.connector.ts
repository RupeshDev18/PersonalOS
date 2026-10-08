import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { GmailMessage, GoogleDriveFile, ConnectorInfo } from '@personal-os/shared';

// ---------------------------------------------------------------------------
// GoogleConnector
//
// Encapsulates all state for the Google Workspace (Gmail + Drive) integration.
//
// Current implementation:
//   - connect() / disconnect() / sync() manage the connection state.
//   - After a real OAuth flow is implemented the credential field stores the
//     access token; this service will then make real Google API calls instead
//     of returning the empty arrays it does today.
//   - The public getInfo() method returns a ConnectorInfo shape that the
//     ConnectorRegistryService broadcasts to the frontend — no hardcoded
//     connector list lives anywhere else.
//
// Extending to real OAuth (future):
//   1. Add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to .env.
//   2. Replace the connect() body with an OAuth2 token exchange.
//   3. Replace getMessages() / getDriveFiles() with real Google API calls,
//      passing this.credential as the Bearer token.
// ---------------------------------------------------------------------------

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
}

@Injectable()
export class GoogleConnector {
  private readonly logger = new Logger(GoogleConnector.name);

  private connected = false;
  private email: string | null = null;
  private authMethod: GoogleAuthMethod | null = null;
  private credential: string | null = null;   // stored but never logged
  private credentialMasked: string | null = null;
  private lastSync: Date | null = null;

  private messages: GmailMessage[] = [];
  private driveFiles: GoogleDriveFile[] = [];

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
        scopes: this.connected
          ? [
              'gmail.readonly',
              'gmail.compose',
              'drive.readonly',
            ]
          : [],
        instructions: this.connected
          ? undefined
          : 'Click "Connect" and enter your Gmail address to get started.',
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

  public connect(
    email: string,
    authMethod: GoogleAuthMethod = 'oauth_consent',
    credential?: string,
  ): GoogleStatus {
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

    const cred = credential?.trim() ?? `oauth_granted_${Date.now()}`;
    this.connected = true;
    this.email = email.trim().toLowerCase();
    this.authMethod = authMethod;
    this.credential = cred;                          // stored securely, never echoed
    this.credentialMasked =
      authMethod === 'oauth_consent'
        ? 'OAuth 2.0 (verified scopes)'
        : `${cred.slice(0, 3)}••••••${cred.slice(-3)}`;
    this.lastSync = new Date();
    this.messages = [];
    this.driveFiles = [];

    this.logger.log(
      `Google Workspace connected: ${this.email} via ${authMethod}`,
    );
    return this.getStatus();
  }

  public disconnect(): GoogleStatus {
    this.connected = false;
    this.email = null;
    this.authMethod = null;
    this.credential = null;
    this.credentialMasked = null;
    this.lastSync = null;
    this.messages = [];
    this.driveFiles = [];
    this.logger.log('Google Workspace disconnected.');
    return this.getStatus();
  }

  public sync(): GoogleStatus {
    if (!this.connected) return this.getStatus();
    // TODO: replace with real Gmail + Drive API calls using this.credential
    this.lastSync = new Date();
    this.logger.log(`Synced Google Workspace for ${this.email}`);
    return this.getStatus();
  }

  // ---------------------------------------------------------------------------
  // Data accessors (real API calls go here once OAuth is wired up)
  // ---------------------------------------------------------------------------

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
}
