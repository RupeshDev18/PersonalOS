import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from './auth.service';

/**
 * PUBLIC_ROUTE decorator — mark a controller method to skip auth.
 *
 * Usage:
 *   @Public()
 *   @Post('login')
 *   login(...) {}
 */
import { SetMetadata } from '@nestjs/common';
export const PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(PUBLIC_KEY, true);

/**
 * Global guard: validates the session token present in the
 * Authorization header and attaches userId to the request.
 *
 * Routes decorated with @Public() bypass this check.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    try {
      const userId = this.authService.validateAuthHeader(authHeader);
      // Attach userId so downstream services can use it without trusting the body.
      (request as Request & { userId: string }).userId = userId;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or missing session token.');
    }
  }
}
