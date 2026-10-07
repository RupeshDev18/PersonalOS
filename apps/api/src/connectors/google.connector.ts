import { Injectable, Logger } from '@nestjs/common';
import { GmailMessage, GoogleDriveFile } from '@personal-os/shared';

@Injectable()
export class GoogleConnector {
  private readonly logger = new Logger(GoogleConnector.name);

  private isConnected: boolean = false;
  private connectedEmail: string | null = null;
  private lastSyncTime: Date | null = null;

  private messages: GmailMessage[] = [];
  private driveFiles: GoogleDriveFile[] = [];

  public getStatus() {
    return {
      connected: this.isConnected,
      email: this.connectedEmail,
      lastSync: this.lastSyncTime ? this.lastSyncTime.toISOString() : null,
      unreadEmails: this.messages.filter((m) => m.isUnread).length,
      indexedFilesCount: this.driveFiles.length,
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    };
  }

  public connect(email?: string) {
    this.isConnected = true;
    this.connectedEmail = email || 'user@gmail.com';
    this.lastSyncTime = new Date();
    this.logger.log(`Google Workspace connected for account: ${this.connectedEmail}`);
    this.messages = [];
    this.driveFiles = [];
    return this.getStatus();
  }

  public disconnect() {
    this.isConnected = false;
    this.connectedEmail = null;
    this.lastSyncTime = null;
    this.messages = [];
    this.driveFiles = [];
    this.logger.log(`Google Workspace disconnected.`);
    return this.getStatus();
  }

  public getMessages(filterCategory?: string): GmailMessage[] {
    if (!this.isConnected) return [];
    if (filterCategory) {
      return this.messages.filter((m) => m.category === filterCategory);
    }
    return this.messages;
  }

  public getUnreadRecruiterEmails(): GmailMessage[] {
    if (!this.isConnected) return [];
    return this.messages.filter((m) => m.category === 'recruiters' && m.isUnread);
  }

  public getDriveFiles(fileTypeFilter?: string): GoogleDriveFile[] {
    if (!this.isConnected) return [];
    if (fileTypeFilter) {
      return this.driveFiles.filter((f) => f.fileType === fileTypeFilter);
    }
    return this.driveFiles;
  }

  public getDriveFileById(fileId: string): GoogleDriveFile | undefined {
    return this.driveFiles.find((f) => f.id === fileId);
  }

  public sync() {
    if (!this.isConnected) return this.getStatus();
    this.lastSyncTime = new Date();
    this.logger.log(`Synced Gmail and Google Drive for ${this.connectedEmail}`);
    return this.getStatus();
  }

  public draftEmail(to: string, subject: string, bodyText: string): GmailMessage {
    const draft: GmailMessage = {
      id: `draft-${Date.now()}`,
      threadId: `th-draft-${Date.now()}`,
      from: this.connectedEmail || 'user@gmail.com',
      fromName: 'Me',
      to,
      subject,
      snippet: bodyText.slice(0, 80) + '...',
      bodyText,
      date: new Date().toISOString(),
      isUnread: false,
      category: 'primary',
    };
    this.messages.unshift(draft);
    return draft;
  }
}
