import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes, scrypt as scryptCallback, createHash, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { UserProfile } from '@personal-os/shared';
import { PrismaService } from '../prisma/prisma.service';

const scrypt = promisify(scryptCallback);
const SESSION_LIFETIME_MS = 1000 * 60 * 60 * 24 * 30;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private tokenDigest(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    return `${salt}:${derived.toString('hex')}`;
  }

  private async verifyPassword(password: string, stored: string): Promise<boolean> {
    const [salt, digest] = stored.split(':');
    if (!salt || !digest) return false;
    const expected = Buffer.from(digest, 'hex');
    const actual = (await scrypt(password, salt, expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  private toProfile(user: { id: string; email: string; name: string; createdAt: Date }): UserProfile {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: '',
      title: 'Personal OS Operator',
      bio: '',
      createdAt: user.createdAt.toISOString(),
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
      preferences: { theme: 'dark', aiTone: 'professional', notificationChannels: ['dashboard'] },
    };
  }

  private async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({
      data: {
        tokenHash: this.tokenDigest(token),
        userId,
        expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
      },
    });
    return token;
  }

  public async validateToken(token: string): Promise<string> {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.tokenDigest(token) },
      select: { userId: true, expiresAt: true },
    });
    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await this.prisma.session.deleteMany({ where: { tokenHash: this.tokenDigest(token) } });
      }
      throw new UnauthorizedException('Invalid or expired session token.');
    }
    return session.userId;
  }

  public async validateAuthHeader(authHeader: string | undefined): Promise<string> {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }
    const token = authHeader.slice(7).trim();
    if (!token) throw new UnauthorizedException('Missing bearer token.');
    return this.validateToken(token);
  }

  public async getMe(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) throw new UnauthorizedException('User not found.');
    return this.toProfile(user);
  }

  public async login(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
    if (!user?.passwordHash || !(await this.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }
    return {
      user: this.toProfile(user),
      token: await this.createSession(user.id),
    };
  }

  public async signup(
    name: string,
    email: string,
    password: string,
    _title?: string,
  ): Promise<{ user: UserProfile; token: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    const passwordProtectedAccounts = await this.prisma.user.count({ where: { passwordHash: { not: null } } });
    if (passwordProtectedAccounts > 0) {
      throw new BadRequestException('This local build supports one operator account. Multi-user access is not enabled yet.');
    }
    const cleanEmail = email.trim().toLowerCase();
    const passwordHash = await this.hashPassword(password);
    if (existing && !existing.passwordHash) {
      const claimed = await this.prisma.user.updateMany({
        where: { id: existing.id, passwordHash: null },
        data: { passwordHash },
      });
      if (claimed.count !== 1) throw new BadRequestException('This account could not be initialized.');
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: existing.id } });
      return { user: this.toProfile(user), token: await this.createSession(user.id) };
    }
    if (existing) throw new BadRequestException('An account with this email already exists.');
    try {
      const user = await this.prisma.user.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          passwordHash,
        },
      });
      return {
        user: this.toProfile(user),
        token: await this.createSession(user.id),
      };
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new BadRequestException('An account with this email already exists.');
      }
      throw error;
    }
  }

  public async logout(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { tokenHash: this.tokenDigest(token) } });
  }
}
