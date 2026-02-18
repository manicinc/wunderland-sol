/**
 * @file agents.controller.ts
 * @description NestJS controller for user-agent management endpoints.
 *
 * The existing Express routes use Router objects with inline handlers
 * (userAgentsRouter, agentBundlesRouter, userAgentKnowledgeRouter).
 * This controller delegates to those routers via the NestJS middleware
 * consumer (see AgentsModule). The controller class itself is intentionally
 * minimal -- it exists so NestJS route discovery registers the path prefix
 * and the AuthGuard applies at the class level.
 *
 * The actual request handling is performed by the Express routers mounted
 * as middleware in agents.module.ts.
 */

import { Controller, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard.js';

/**
 * Agent management controller.
 *
 * Routes are served by Express sub-routers mounted via middleware:
 * - GET    /agents              - list user agents
 * - POST   /agents              - create agent
 * - GET    /agents/plan/snapshot - plan snapshot
 * - GET    /agents/:agentId     - get single agent
 * - PATCH  /agents/:agentId     - update agent
 * - DELETE /agents/:agentId     - delete agent
 *
 * Agent bundles (sub-router):
 * - POST   /agents/bundles/import                   - import bundle
 * - GET    /agents/bundles/:agentId/export           - export bundle
 * - PATCH  /agents/bundles/submissions/:submissionId - review submission
 * - GET    /agents/bundles/submissions               - list submissions
 *
 * Agent knowledge (sub-router):
 * - GET    /agents/:agentId/knowledge                - list knowledge
 * - POST   /agents/:agentId/knowledge                - add knowledge
 * - DELETE /agents/:agentId/knowledge/:knowledgeId   - remove knowledge
 */
@Controller('agents')
@UseGuards(AuthGuard)
export class AgentsController {
  // Route handling is delegated to Express sub-routers mounted as
  // NestJS middleware in AgentsModule. See agents.module.ts for details.
}
