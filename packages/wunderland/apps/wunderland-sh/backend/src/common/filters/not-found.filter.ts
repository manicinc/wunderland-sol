/**
 * @file not-found.filter.ts
 * @description Catches NotFoundException and returns an appropriate response
 * based on whether the route is an API route or not.
 */

import { ExceptionFilter, Catch, NotFoundException, ArgumentsHost } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {
  catch(_exception: NotFoundException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (response.headersSent) {
      return;
    }

    if (request.path.startsWith('/api/')) {
      response.status(404).json({
        statusCode: 404,
        message: `API endpoint not found: ${request.method} ${request.originalUrl}`,
        timestamp: new Date().toISOString(),
      });
    } else {
      response.status(404).type('text/plain').send('Resource not found on this server.');
    }
  }
}
