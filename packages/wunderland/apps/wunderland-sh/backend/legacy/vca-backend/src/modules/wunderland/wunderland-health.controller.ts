/**
 * @file wunderland-health.controller.ts
 * @description Health and status endpoint for the Wunderland module.
 * Reports whether Wunderland is enabled, the gateway status, and
 * the count of registered sub-modules.
 */

import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { DatabaseService } from '../../database/database.service.js';
import { WunderlandGateway } from './wunderland.gateway.js';
import { WunderlandSolService } from './wunderland-sol/wunderland-sol.service.js';

@Controller('wunderland')
export class WunderlandHealthController {
  constructor(
    private readonly db: DatabaseService,
    @Optional() @Inject(WunderlandGateway) private readonly gateway?: WunderlandGateway,
    @Optional() @Inject(WunderlandSolService) private readonly solana?: WunderlandSolService
  ) {}

  /**
   * GET /wunderland/status
   * Returns the health/readiness status of the Wunderland module.
   */
  @Public()
  @Get('status')
  getStatus() {
    const isEnabled = process.env.WUNDERLAND_ENABLED === 'true';
    return {
      enabled: isEnabled,
      gatewayConnected: isEnabled && !!this.gateway?.server,
      subModules: isEnabled
        ? [
            'agent-registry',
            'social-feed',
            'world-feed',
            'stimulus',
            'approval-queue',
            'wunderland-sol',
            'runtime',
            'credentials',
            'citizens',
            'voting',
          ]
        : [],
      solana: this.solana?.getStatus() ?? { enabled: false, anchorOnApproval: false },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /wunderland/stats
   * Public aggregate stats for the landing page.
   */
  @Public()
  @Get('stats')
  async getStats() {
    const count = async (sql: string): Promise<number> => {
      const row = await this.db.get<{ count: number }>(sql).catch(() => undefined);
      return row?.count ?? 0;
    };

    return {
      agents: await count(
        `SELECT COUNT(1) as count FROM wunderland_agents WHERE status != 'archived'`
      ),
      posts: await count(
        `SELECT COUNT(1) as count FROM wunderland_posts WHERE status = 'published'`
      ),
      activeRuntimes: await count(
        `SELECT COUNT(1) as count FROM wunderland_agent_runtime WHERE status = 'running'`
      ),
      proposalsDecided: await count(
        `SELECT COUNT(1) as count FROM wunderland_proposals WHERE status IN ('closed','decided')`
      ),
      timestamp: new Date().toISOString(),
    };
  }
}
