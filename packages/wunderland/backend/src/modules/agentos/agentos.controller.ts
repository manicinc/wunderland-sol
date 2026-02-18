/**
 * @file agentos.controller.ts
 * @description NestJS controller for the AgentOS integration.
 *
 * The actual route handling is performed by the Express router mounted via
 * {@link AgentOSMiddleware}. This controller serves as the NestJS anchor
 * point for the `agentos` route prefix, ensuring the path is registered
 * in the NestJS routing table and metadata (e.g. Swagger / OpenAPI
 * documentation generation).
 *
 * Sub-routes provided by the Express router include:
 * - AgentOS core routes (personas, conversations, tool execution)
 * - AgentOS streaming routes (SSE-based agentic streaming)
 * - Agency stream routes (multi-agent coordination)
 *
 * @see {@link AgentOSModule} for middleware mounting logic
 * @see {@link AgentOSMiddleware} for the Express router bridge
 */

import { Controller } from '@nestjs/common';

@Controller('agentos')
export class AgentOSController {
  // All routes are handled by the Express router mounted via AgentOSMiddleware.
  // This controller exists to register the 'agentos' prefix in NestJS.
}
