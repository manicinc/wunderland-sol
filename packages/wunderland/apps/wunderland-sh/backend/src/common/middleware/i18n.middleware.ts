/**
 * @file i18n.middleware.ts
 * @description NestJS middleware wrapping the existing i18next setup.
 * Delegates to the setupI18nMiddleware() function from the legacy codebase.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { setupI18nMiddleware } from '../../../middleware/i18n.js';

/** Cached i18n handler functions. */
let i18nHandlers: ((req: Request, res: Response, next: NextFunction) => void)[] | null = null;

@Injectable()
export class I18nMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!i18nHandlers) {
      const handlers = await setupI18nMiddleware();
      i18nHandlers = Array.isArray(handlers) ? handlers : [handlers];
    }

    // Chain through all i18n handlers
    let idx = 0;
    const step = (err?: unknown) => {
      if (err) return next(err);
      if (idx >= i18nHandlers!.length) return next();
      const handler = i18nHandlers![idx++];
      try {
        handler(req, res, step);
      } catch (e) {
        next(e);
      }
    };
    step();
  }
}
