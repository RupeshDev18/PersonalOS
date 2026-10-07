import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UserProfile } from '@personal-os/shared';

@Injectable()
export class AuthService {
  private users: Map<string, UserProfile & { passwordHash?: string }> = new Map();
  private activeUserId: string = 'user-rupesh';

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers() {
    const rupesh: UserProfile & { passwordHash?: string } = {
      id: 'user-rupesh',
      name: 'Rupesh Yadav',
      email: 'ry993494787@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
      title: 'Senior Full Stack & AI Systems Engineer',
      bio: 'Specializing in Next.js, NestJS, Multi-Agent Systems, and Distributed Infrastructure.',
      createdAt: new Date('2026-01-15').toISOString(),
      connectedAccounts: {
        google: {
          connected: true,
          email: 'ry993494787@gmail.com',
          connectedAt: new Date('2026-09-01').toISOString(),
          scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/drive.readonly',
          ],
          unreadEmailCount: 3,
          indexedDriveFilesCount: 4,
        },
      },
      preferences: {
        theme: 'dark',
        aiTone: 'playful',
        notificationChannels: ['email', 'dashboard'],
      },
    };

    const alex: UserProfile & { passwordHash?: string } = {
      id: 'user-alex',
      name: 'Alex Chen',
      email: 'alex.chen.dev@gmail.com',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80',
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

  public getMe(userId?: string): UserProfile {
    const id = userId || this.activeUserId;
    const user = this.users.get(id);
    if (!user) {
      return this.users.get('user-rupesh')!;
    }
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  public getAllUsers(): UserProfile[] {
    return Array.from(this.users.values()).map(({ passwordHash, ...safeUser }) => safeUser);
  }

  public switchActiveUser(userId: string): UserProfile {
    if (!this.users.has(userId)) {
      throw new BadRequestException(`User ${userId} not found`);
    }
    this.activeUserId = userId;
    return this.getMe(userId);
  }

  public login(email: string, _password?: string): { user: UserProfile; token: string } {
    const cleanEmail = email?.trim().toLowerCase();
    const found = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === cleanEmail,
    );

    if (!found) {
      throw new UnauthorizedException('No account associated with this email address.');
    }

    this.activeUserId = found.id;
    const { passwordHash, ...safeUser } = found;
    return {
      user: safeUser,
      token: `sess_${found.id}_${Date.now()}`,
    };
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
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
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
    this.activeUserId = newId;

    return {
      user: newUser,
      token: `sess_${newId}_${Date.now()}`,
    };
  }

  public updateGoogleConnection(userId: string, connected: boolean, googleEmail?: string): UserProfile {
    const user = this.users.get(userId);
    if (!user) throw new BadRequestException(`User ${userId} not found`);

    user.connectedAccounts.google = {
      connected,
      email: connected ? (googleEmail || user.email) : '',
      connectedAt: connected ? new Date().toISOString() : '',
      scopes: connected
        ? [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.compose',
            'https://www.googleapis.com/auth/drive.readonly',
          ]
        : [],
      unreadEmailCount: connected ? 3 : 0,
      indexedDriveFilesCount: connected ? 4 : 0,
    };

    this.users.set(userId, user);
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
