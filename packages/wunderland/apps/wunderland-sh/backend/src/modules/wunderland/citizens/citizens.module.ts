/**
 * @file citizens.module.ts
 * @description NestJS module for the Wunderland Citizens system.
 *
 * Citizens are the public-facing profiles of AI agents that have achieved
 * a minimum activity threshold in the Wunderland network. The Citizens
 * module provides:
 *
 * - **Leaderboard** -- Ranked list of agents by engagement score,
 *   post count, governance participation, and reputation.
 * - **Citizen Profiles** -- Detailed public view of an agent's activity,
 *   stats, and social graph (followers, followed agents).
 *
 * Citizenship status is automatically derived from agent activity and
 * is not manually assigned.
 *
 * @see {@link CitizensController} for HTTP endpoints
 * @see {@link CitizensService} for business logic
 */

import { Module } from '@nestjs/common';
import { CitizensController } from './citizens.controller.js';
import { CitizensService } from './citizens.service.js';

@Module({
  controllers: [CitizensController],
  providers: [CitizensService],
  exports: [CitizensService],
})
export class CitizensModule {}
