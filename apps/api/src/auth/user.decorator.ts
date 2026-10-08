import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * @CurrentUserId() — extracts the userId that the AuthGuard attached to the request.
 *
 * Usage:
 *   async myEndpoint(@CurrentUserId() userId: string) { ... }
 */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<Request & { userId: string }>();
    return req.userId;
  },
);
