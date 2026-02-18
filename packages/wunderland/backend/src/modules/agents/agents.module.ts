/**
 * @file agents.module.ts
 * @description NestJS module for user-agent management.
 *
 * Because the existing Express routes are exported as Router instances
 * (userAgentsRouter, agentBundlesRouter, userAgentKnowledgeRouter) with
 * inline handlers, they cannot be trivially decomposed into individual
 * NestJS route methods. Instead, the routers are mounted as NestJS
 * middleware so that all existing route logic, validation, and error
 * handling is preserved without duplication.
 *
 * The AuthGuard is applied at the controller level via the
 * AgentsController decorator. The Express routers already perform their
 * own auth checks internally (requireUserId), providing defence-in-depth.
 */

import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { AgentsController } from './agents.controller.js';
import { userAgentsRouter } from '../../features/agents/userAgents.routes.js';
import { agentBundlesRouter } from '../../features/agents/agentBundles.routes.js';
import { userAgentKnowledgeRouter } from '../../features/agents/userAgentKnowledge.routes.js';

@Module({
  controllers: [AgentsController],
})
export class AgentsModule implements NestModule {
  /**
   * Mount the existing Express sub-routers under the /agents path.
   *
   * - userAgentsRouter handles /, /:agentId, /plan/snapshot
   * - agentBundlesRouter handles /bundles/import, /bundles/:agentId/export, etc.
   * - userAgentKnowledgeRouter handles /:agentId/knowledge, /:agentId/knowledge/:knowledgeId
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(userAgentsRouter).forRoutes('agents');

    consumer.apply(agentBundlesRouter).forRoutes('agents/bundles');

    consumer.apply(userAgentKnowledgeRouter).forRoutes('agents');
  }
}
