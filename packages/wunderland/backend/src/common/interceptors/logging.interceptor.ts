/**
 * @file logging.interceptor.ts
 * @description Global request logging interceptor. Logs method, URL,
 * status code, and response time for every request. Replaces morgan.
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('Http');

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const startMs = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startMs;
          logger.info(
            '%s %s %d %dms',
            request.method,
            request.url,
            response.statusCode,
            durationMs
          );
        },
        error: (err) => {
          const durationMs = Date.now() - startMs;
          logger.error(
            '%s %s %d %dms - %s',
            request.method,
            request.url,
            response.statusCode || 500,
            durationMs,
            err?.message || 'Unknown error'
          );
        },
      })
    );
  }
}
