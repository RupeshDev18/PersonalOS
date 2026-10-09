import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { UserProfile } from '@personal-os/shared';

// ---------------------------------------------------------------------------
// Session store: token → userId
// In a real deployment this would be Redis + signed JWTs. For the personal-OS
// single-user setup it is an in-memory map that survives the process lifetime.
// The important change from the old code is that every subsequent request
// is validated against this map via the AuthGuard, so userId can no longer
// be injected freely from the request body.
// ---------------------------------------------------------------------------

@Injectable()
export class AuthService {
  private users: Map<string, UserProfile> = new Map();
  private sessions: Map<string, string> = new Map(); // token → userId

  constructor() {
    this.seedDefaultUsers();
  }

  // -------------------------------------------------------------------------
  // Seed
  // -------------------------------------------------------------------------

  private seedDefaultUsers(): void {
    const rupesh: UserProfile = {
      id: 'user-rupesh',
      name: 'Rupesh Yadav',
      email: 'ry993494787@gmail.com',
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
      title: 'Senior Full Stack & AI Systems Engineer',
      bio: 'Specializing in Next.js, NestJS, Multi-Agent Systems, and Distributed Infrastructure.',
      createdAt: new Date('2026-01-15').toISOString(),
      connectedAccounts: {
        google: {
          connected: false,
          email: '',
          connectedAt: '',
          scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/drive.readonly',
          ],
          unreadEmailCount: 0,
          indexedDriveFilesCount: 0,
        },
      },
      preferences: {
        theme: 'dark',
        aiTone: 'playful',
        notificationChannels: ['email', 'dashboard'],
      },
    };

    const alex: UserProfile = {
      id: 'user-alex',
      name: 'Alex Chen',
      email: 'alex.chen.dev@gmail.com',
      avatar:
        'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80',
      title: 'Product Designer & Frontend Specialist',
      bio: 'Design systems, interactive micro-animations, and UX research.',
      createdAt: new Date('2026-03-10').toISOString(),
      connectedAccounts: {
        google: {
          connected: false,
          email: '',
          connectedAt: '',
          scopes: [],
          unreadEmailCount: 0,
          indexedDriveFilesCount: 0,
        },
      },
      preferences: {
        theme: 'dark',
        aiTone: 'professional',
        notificationChannels: ['dashboard'],
      },
    };

    this.users.set(rupesh.id, rupesh);
    this.users.set(alex.id, alex);
  }

  // -------------------------------------------------------------------------
  // Session helpers
  // -------------------------------------------------------------------------

  /** Mint an opaque session token and store it. */
  private createSession(userId: string): string {
    const token = `sess_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    this.sessions.set(token, userId);
    return token;
  }

  /**
   * Validate a token from the Authorization header.
   * Returns the userId if valid, throws UnauthorizedException otherwise.
   */
  public validateToken(token: string): string {
    const userId = this.sessions.get(token);
    if (!userId) {
      throw new UnauthorizedException('Invalid or expired session token.');
    }
    return userId;
  }

  /**
   * Extract and validate the bearer token from the raw Authorization header value.
   * Accepts both "Bearer <token>" and bare tokens.
   */
  public validateAuthHeader(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header.');
    }
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : authHeader.trim();
    return this.validateToken(token);
  }

  // -------------------------------------------------------------------------
  // Public API consumed by AuthController
  // -------------------------------------------------------------------------

  public getMe(userId: string): UserProfile {
    const user = this.users.get(userId);
    if (!user) throw new UnauthorizedException('User not found.');
    return user;
  }

  public getAllUsers(): UserProfile[] {
    return Array.from(this.users.values());
  }

  public login(
    email: string,
    _password?: string,
  ): { user: UserProfile; token: string } {
    const cleanEmail = email?.trim().toLowerCase();
    let found = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === cleanEmail,
    );

    // Support developer aliases for primary operator profile
    if (!found && cleanEmail && (cleanEmail === 'rupesh.dev@gmail.com' || cleanEmail === 'rupesh@gmail.com' || cleanEmail === 'rupesh.yadav@gmail.com')) {
      found = this.users.get('user-rupesh');
    }

    if (!found) {
      throw new UnauthorizedException(
        'No account associated with this email address. Please switch to Sign Up to create your operator account.',
      );
    }
    return { user: found, token: this.createSession(found.id) };
  }

  public signup(
    name: string,
    email: string,
    _password?: string,
    title?: string,
  ): { user: UserProfile; token: string } {
    const cleanEmail = email?.trim().toLowerCase();
    const existing = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === cleanEmail,
    );
    if (existing) {
      throw new BadRequestException('An account with this email already exists.');
    }

    const newId = `user-${Date.now()}`;
    const newUser: UserProfile = {
      id: newId,
      name: name?.trim() || 'New Operator',
      email: cleanEmail,
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
      title: title?.trim() || 'Software Engineer',
      bio: 'Personal AI OS Operator',
      createdAt: new Date().toISOString(),
      connectedAccounts: {
        google: {
          connected: false,
          email: '',
          connectedAt: '',
          scopes: [],
          unreadEmailCount: 0,
          indexedDriveFilesCount: 0,
        },
      },
      preferences: {
        theme: 'dark',
        aiTone: 'playful',
        notificationChannels: ['dashboard'],
      },
    };

    this.users.set(newId, newUser);
    return { user: newUser, token: this.createSession(newId) };
  }

  public logout(token: string): void {
    this.sessions.delete(token);
  }

  public updateGoogleConnection(
    userId: string,
    connected: boolean,
    googleEmail?: string,
  ): UserProfile {
    const user = this.users.get(userId);
    if (!user) throw new BadRequestException(`User ${userId} not found`);

    user.connectedAccounts.google = {
      connected,
      email: connected ? googleEmail || user.email : '',
      connectedAt: connected ? new Date().toISOString() : '',
      scopes: connected
        ? [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/drive.readonly',
          ]
        : [],
      unreadEmailCount: 0,
      indexedDriveFilesCount: 0,
    };

    this.users.set(userId, user);
    return user;
  }
}
