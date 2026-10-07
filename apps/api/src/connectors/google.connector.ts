import { Injectable, Logger } from '@nestjs/common';
import { GmailMessage, GoogleDriveFile } from '@personal-os/shared';

@Injectable()
export class GoogleConnector {
  private readonly logger = new Logger(GoogleConnector.name);

  private isConnected: boolean = true;
  private connectedEmail: string = 'ry993494787@gmail.com';
  private lastSyncTime: Date = new Date();

  private messages: GmailMessage[] = [
    {
      id: 'msg-stripe-001',
      threadId: 'th-stripe-001',
      from: 'sjenkins@stripe.com',
      fromName: 'Sarah Jenkins (Stripe Talent)',
      to: 'ry993494787@gmail.com',
      subject: 'Interview Invitation: Senior Full Stack Engineer (Core Payments)',
      snippet: 'Hi Rupesh, thank you for submitting your tailored profile. We were very impressed with your distributed systems background...',
      bodyText: `Hi Rupesh,

Thank you for your application for the Senior Full Stack Engineer role on the Core Payments team at Stripe.

The engineering hiring committee reviewed your profile and your experience building high-throughput event architectures with NestJS, Next.js, and TypeScript matches our current roadmap.

We would love to invite you to a 45-minute technical conversation with our Engineering Lead this Thursday or Friday. 

Please let us know which time slots work best for you!

Best regards,
Sarah Jenkins
Technical Recruiting | Stripe`,
      date: new Date(Date.now() - 3600000 * 2).toISOString(),
      isUnread: true,
      category: 'recruiters',
      company: 'Stripe',
    },
    {
      id: 'msg-cloudflare-002',
      threadId: 'th-cloudflare-002',
      from: 'dlin@cloudflare.com',
      fromName: 'David Lin (Cloudflare Recruiting)',
      to: 'ry993494787@gmail.com',
      subject: 'Update on Systems Engineer Application',
      snippet: 'Hello Rupesh, your resume for Systems & Network Engineer has been forwarded to the hiring team...',
      bodyText: `Hello Rupesh,

Quick update regarding your application for the Systems & Infrastructure Engineer position at Cloudflare. 

Our team reviewed your resume and would like to confirm your preferred working mode (remote/hybrid) and notice period.

Looking forward to hearing from you.

Cheers,
David Lin
Cloudflare Talent Acquisition`,
      date: new Date(Date.now() - 3600000 * 18).toISOString(),
      isUnread: true,
      category: 'recruiters',
      company: 'Cloudflare',
    },
    {
      id: 'msg-google-sec-003',
      threadId: 'th-google-sec-003',
      from: 'no-reply@accounts.google.com',
      fromName: 'Google Account Security',
      to: 'ry993494787@gmail.com',
      subject: 'Security alert: Personal OS granted read-only access to Gmail and Drive',
      snippet: 'Personal OS Command Center was granted access to your Google Account ry993494787@gmail.com...',
      bodyText: `Your Google Account was successfully linked to Personal OS.
Scopes granted:
- View your email messages (gmail.readonly)
- View files in your Google Drive (drive.readonly)

If you authorized this application, no further action is needed.`,
      date: new Date(Date.now() - 3600000 * 36).toISOString(),
      isUnread: false,
      category: 'updates',
    },
    {
      id: 'msg-amazon-004',
      threadId: 'th-amazon-004',
      from: 'order-update@amazon.in',
      fromName: 'Amazon.in',
      to: 'ry993494787@gmail.com',
      subject: 'Dispatched: Your Amazon.in package is on its way',
      snippet: 'Your order containing Keychron Q1 Max Mechanical Keyboard has been dispatched...',
      bodyText: `Hello Rupesh,

Your package containing Keychron Q1 Max (Wireless Custom Keyboard) has been dispatched and is scheduled to arrive tomorrow by 8:00 PM.

Order total: ₹18,999. Track package on your Amazon account.`,
      date: new Date(Date.now() - 3600000 * 48).toISOString(),
      isUnread: false,
      category: 'finance',
    },
  ];

  private driveFiles: GoogleDriveFile[] = [
    {
      id: 'file-resume-fullstack-2026',
      name: 'Rupesh_Yadav_FullStack_2026.md',
      mimeType: 'text/markdown',
      sizeBytes: 4280,
      lastModified: new Date(Date.now() - 3600000 * 12).toISOString(),
      fileType: 'resume',
      url: 'https://drive.google.com/file/d/1rupesh-fullstack-2026/view',
      contentMarkdown: `# Rupesh Yadav
Senior Full Stack & AI Systems Engineer
Email: ry993494787@gmail.com | GitHub: github.com/RupeshDev18 | Location: Bengaluru / Remote

## Summary
Full Stack Software Engineer with deep expertise in TypeScript, Next.js 14, NestJS, microservices, and autonomous multi-agent orchestration. Proven track record architecting high-scale distributed systems and human-in-the-loop AI workflows.

## Technical Skills
- **Languages:** TypeScript, JavaScript, Python, Go, SQL
- **Frontend:** Next.js (App Router), React 18, Tailwind CSS, WebSockets
- **Backend:** NestJS, Node.js, Express, REST APIs, GraphQL, gRPC
- **Databases & Cache:** PostgreSQL (pgvector), Redis, MongoDB
- **Cloud & DevOps:** AWS (ECS, Lambda, S3, CloudFront), Docker, CI/CD GitHub Actions

## Professional Experience
### Senior Software Engineer | Distributed Systems & AI Platform
*2023 - Present*
- Architected multi-agent execution pipeline reducing complex task orchestration latency by 45%.
- Implemented tamper-evident cryptographic audit ledger logging state transitions with SHA-256 hashes.
- Built responsive enterprise Next.js dashboards serving 100k+ daily requests with 99.99% uptime.

### Full Stack Engineer | Cloud Products & Microservices
*2021 - 2023*
- Designed and migrated legacy monolith to 12 modular NestJS microservices communicating over Redis pub/sub.
- Created real-time price intelligence and scraping engines with automated proxy rotation and retry resilience.
`,
    },
    {
      id: 'file-resume-cloud-architect',
      name: 'Rupesh_Yadav_Cloud_Architect.md',
      mimeType: 'text/markdown',
      sizeBytes: 3950,
      lastModified: new Date(Date.now() - 3600000 * 72).toISOString(),
      fileType: 'resume',
      url: 'https://drive.google.com/file/d/1rupesh-cloud-arch/view',
      contentMarkdown: `# Rupesh Yadav
Cloud Solutions Architect & Systems Engineer
Email: ry993494787@gmail.com | Bengaluru, India

## Core Competencies
- Multi-cloud architecture (AWS, GCP), Docker containerization, Kubernetes
- Distributed event streaming, Redis queueing, BullMQ workers
- Database sharding, read-replicas, and pgvector semantic embeddings

## Selected Projects
- **Personal AI Operating System:** Autonomous multi-agent coordination with least-privilege permission sandboxing.
- **Enterprise Event Mesh:** Processed 2M+ transactions daily with sub-50ms latency across distributed AWS regions.
`,
    },
    {
      id: 'file-cover-letter-stripe',
      name: 'Stripe_Application_Cover_Letter.md',
      mimeType: 'text/markdown',
      sizeBytes: 2150,
      lastModified: new Date(Date.now() - 3600000 * 24).toISOString(),
      fileType: 'document',
      url: 'https://drive.google.com/file/d/1stripe-cover-letter/view',
      contentMarkdown: `Dear Stripe Engineering Team,

I have followed Stripe's infrastructure innovations closely, from your developer-centric payment APIs to global reliability standards. My experience architecting event-driven systems and secure tool gateways makes this role an ideal match...`,
    },
    {
      id: 'file-budget-2026',
      name: 'Annual_Tech_Budget_and_Discretionary.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 15400,
      lastModified: new Date(Date.now() - 3600000 * 120).toISOString(),
      fileType: 'spreadsheet',
      url: 'https://drive.google.com/file/d/1budget-2026/view',
    },
  ];

  public getStatus() {
    return {
      connected: this.isConnected,
      email: this.connectedEmail,
      lastSync: this.lastSyncTime.toISOString(),
      unreadEmails: this.messages.filter((m) => m.isUnread).length,
      indexedFilesCount: this.driveFiles.length,
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.compose',
        'https://www.googleapis.com/auth/drive.readonly',
      ],
    };
  }

  public connect(email = 'ry993494787@gmail.com') {
    this.isConnected = true;
    this.connectedEmail = email;
    this.lastSyncTime = new Date();
    this.logger.log(`Google Workspace connected for account: ${email}`);
    return this.getStatus();
  }

  public disconnect() {
    this.isConnected = false;
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
    this.lastSyncTime = new Date();
    this.logger.log(`Synced Gmail and Google Drive for ${this.connectedEmail}`);
    return this.getStatus();
  }

  public draftEmail(to: string, subject: string, bodyText: string): GmailMessage {
    const draft: GmailMessage = {
      id: `draft-${Date.now()}`,
      threadId: `th-draft-${Date.now()}`,
      from: this.connectedEmail,
      fromName: 'Rupesh Yadav',
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
