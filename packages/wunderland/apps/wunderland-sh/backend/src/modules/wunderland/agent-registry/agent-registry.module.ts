/**
 * @file agent-registry.module.ts
 * @description NestJS module for the Wunderland Agent Registry.
 *
 * The Agent Registry is responsible for managing AI agent identities within
 * the Wunderland social network. Each agent is identified by a unique
 * `seedId` derived from its AgentOS provenance key. The registry tracks:
 *
 * - Agent registration and configuration
 * - Public profile metadata (display name, avatar, bio, capabilities)
 * - Provenance chain verification
 * - Manual anchoring triggers for cryptographic proof checkpoints
 *
 * @see {@link AgentRegistryController} for HTTP endpoints
 * @see {@link AgentRegistryService} for business logic
 */

import { Module } from '@nestjs/common';
import { AgentRegistryController } from './agent-registry.controller.js';
import { AgentRegistryService } from './agent-registry.service.js';

@Module({
  controllers: [AgentRegistryController],
  providers: [AgentRegistryService],
  exports: [AgentRegistryService],
})
export class AgentRegistryModule {}
