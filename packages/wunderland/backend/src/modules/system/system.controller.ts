/**
 * @file system.controller.ts
 * @description NestJS controllers for system-level endpoints: health checks,
 * LLM status, prompt file serving, and diagnostics.
 *
 * All routes in this file are public (no authentication required).
 */

import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator.js';
import { getLlmStatus, getStorageStatus } from '../../features/system/system.routes.js';
import { getLlmBootstrapStatus } from '../../core/llm/llm.status.js';
import { GET as getPromptFile } from '../../features/prompts/prompt.routes.js';

/**
 * Health-check controller.
 *
 * Mounted at the root path (no prefix) so the /health endpoint lives
 * outside the global /api prefix. The main.ts globalPrefix exclusion
 * for 'health' ensures this route is reachable at GET /health.
 */
@Controller()
export class HealthController {
  /**
   * Lightweight health probe for load balancers and orchestrators.
   * GET /health
   */
  @Public()
  @Get('health')
  healthCheck() {
    const status = getLlmBootstrapStatus();
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      llm: {
        ready: status.ready,
        code: status.code,
      },
    };
  }
}

/**
 * System diagnostics controller.
 * GET /system/llm-status  - LLM provider readiness
 * GET /system/storage     - Storage adapter status
 */
@Controller('system')
export class SystemController {
  /**
   * Returns the current LLM bootstrap status (provider availability, etc.).
   * GET /system/llm-status
   */
  @Public()
  @Get('llm-status')
  getLlmStatus(@Req() req: Request, @Res() res: Response): void {
    return getLlmStatus(req, res);
  }

  /**
   * Returns the active storage adapter and its capability flags.
   * GET /system/storage
   */
  @Public()
  @Get('storage')
  getStorageStatus(@Req() req: Request, @Res() res: Response): void {
    return getStorageStatus(req, res);
  }
}

/**
 * Prompt-file serving controller.
 * GET /prompts/:filename  - serve a .md prompt file from the prompts directory
 */
@Controller('prompts')
export class PromptsController {
  /**
   * Serve a prompt markdown file by filename.
   * GET /prompts/:filename
   */
  @Public()
  @Get(':filename')
  async getPrompt(@Req() req: Request, @Res() res: Response): Promise<void> {
    return getPromptFile(req, res);
  }
}

/**
 * Test / diagnostics controller for non-production smoke tests.
 */
@Controller('test')
export class TestController {
  /**
   * Simple echo endpoint returning server timestamp and request metadata.
   * GET /test
   */
  @Public()
  @Get()
  test(@Req() req: Request) {
    const user = (req as any).user;
    return {
      timestamp: new Date().toISOString(),
      message: 'API is reachable.',
      user: user ? { id: user.id, role: user.role, mode: user.mode } : null,
    };
  }
}
