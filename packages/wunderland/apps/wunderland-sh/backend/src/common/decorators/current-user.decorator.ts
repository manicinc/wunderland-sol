/**
 * @file current-user.decorator.ts
 * @description Parameter decorator that extracts the authenticated user
 * from the request object. Works with both AuthGuard and OptionalAuthGuard.
 *
 * @example
 * ```ts
 * @Get('profile')
 * getProfile(@CurrentUser() user: any) {
 *   return user;
 * }
 *
 * @Get('profile')
 * getProfileId(@CurrentUser('id') userId: string) {
 *   return userId;
 * }
 * ```
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (data) {
      return user?.[data];
    }
    return user;
  }
);
