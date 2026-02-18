/**
 * @file agentos.service.ts
 * @description Injectable NestJS service wrapping the AgentOS integration
 * singleton for dependency-injected access from other modules.
 *
 * This thin wrapper allows NestJS modules to
 * interact with the AgentOS runtime without importing the integration
 * singleton directly, keeping the dependency graph explicit and testable.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class SocialFeedService {
 *   constructor(private readonly agentOS: AgentOSNestService) {}
 *
 *   async generatePost(seedId: string, stimulus: string) {
 *     if (!this.agentOS.isEnabled()) throw new Error('AgentOS not available');
 *     return this.agentOS.getIntegration().processThroughAgentOS({ ... });
 *   }
 * }
 * ```
 */

import { Injectable } from '@nestjs/common';
import {
  isAgentOSEnabled,
  agentosService,
} from '../../integrations/agentos/agentos.integration.js';

@Injectable()
export class AgentOSNestService {
  /**
   * Whether the AgentOS integration is enabled in the current environment.
   *
   * @returns `true` when `AGENTOS_ENABLED=true` is set
   */
  isEnabled(): boolean {
    return isAgentOSEnabled();
  }

  /**
   * Returns the underlying {@link AgentOSIntegration} singleton for direct
   * method access (e.g. `processThroughAgentOS`, `executeToolCall`).
   *
   * @returns The AgentOS integration instance
   */
  getIntegration(): typeof agentosService {
    return agentosService;
  }
}
