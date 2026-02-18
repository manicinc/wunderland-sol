/**
 * @file public.decorator.ts
 * @description Marks a route handler or controller as publicly accessible,
 * allowing it to bypass the strict AuthGuard.
 *
 * @example
 * ```ts
 * @Public()
 * @Get('health')
 * healthCheck() { return { status: 'UP' }; }
 * ```
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator that marks a route as public (no authentication required).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
