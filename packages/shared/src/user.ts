export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  title?: string;
  bio?: string;
  createdAt: string;
  connectedAccounts: {
    google?: {
      connected: boolean;
      email: string;
      connectedAt: string;
      scopes: string[];
      unreadEmailCount?: number;
      indexedDriveFilesCount?: number;
    };
  };
  preferences: {
    theme?: string;
    notificationChannels?: string[];
    aiTone?: 'professional' | 'playful' | 'concise';
  };
}

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromName: string;
  to: string;
  subject: string;
  snippet: string;
  bodyText: string;
  date: string;
  isUnread: boolean;
  category: 'primary' | 'recruiters' | 'updates' | 'finance';
  company?: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  lastModified: string;
  fileType: 'resume' | 'document' | 'spreadsheet' | 'pdf' | 'notes';
  url?: string;
  contentMarkdown?: string;
}
