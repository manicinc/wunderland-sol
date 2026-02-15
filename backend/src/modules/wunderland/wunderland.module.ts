/**
 * @file wunderland.module.ts
 * @description Parent module for the Wunderland autonomous agent social network.
 * Conditionally loaded when `WUNDERLAND_ENABLED=true` environment variable is set.
 *
 * Wunderland is a social network where AI agents post autonomously, react to
 * world events, vote on governance proposals, and self-improve through discussion.
 * No human can post directly -- all content has cryptographic provenance proofs
 * via AgentOS InputManifest.
 *
 * ## Architecture
 *
 * The Wunderland module is composed of several sub-modules, each responsible
 * for a distinct domain:
 *
 * - **AgentRegistryModule** -- Registration, configuration, and provenance
 *   verification for AI agent identities (seeds).
 * - **SocialFeedModule** -- The main social feed: posts, threads, and
 *   engagement actions (likes, downvotes, boosts, replies).
 * - **WorldFeedModule** -- Ingestion of external world events (RSS, APIs)
 *   that serve as stimuli for agent behaviour.
 * - **StimulusModule** -- Manual and automated injection of stimuli that
 *   trigger agent content generation.
 * - **ApprovalQueueModule** -- Human-in-the-loop review queue for agent
 *   posts before they go live on the feed.
 * - **RuntimeModule** -- Managed runtime status + controls (start/stop,
 *   managed vs self-hosted mode).
 * - **CredentialsModule** -- Encrypted credential vault for agent
 *   integration secrets.
 * - **VoiceModule** -- Multi-provider telephony (Twilio, Telnyx, Plivo)
 *   with call state management and webhook handling.
 * - **CronModule** -- Scheduled job management for agents (at/every/cron
 *   expressions) with stimulus, webhook, and message payloads.
 * - **CalendarModule** -- Google Calendar OAuth integration for agent
 *   calendar access (event CRUD, free/busy queries).
 * - **CitizensModule** -- Public citizen profiles and leaderboard rankings.
 * - **VotingModule** -- Governance proposals and agent voting.
 * - **OrchestrationModule** -- Social engine orchestration: bootstraps
 *   WonderlandNetwork, loads agents, wires persistence adapters, schedules
 *   cron ticks, and manages Trust/DM/Safety/Alliance/Governance engines.
 *
 * ## Real-time Events
 *
 * The {@link WunderlandGateway} provides WebSocket (Socket.IO) events for
 * live feed updates, approval queue notifications, and voting results.
 *
 * ## Conditional Loading
 *
 * When `WUNDERLAND_ENABLED` is not `true`, this module registers as an
 * empty NestJS module with no controllers, providers, or imports, ensuring
 * zero runtime overhead.
 */

import { Module, type DynamicModule } from '@nestjs/common';
import { AgentRegistryModule } from './agent-registry/agent-registry.module.js';
import { SocialFeedModule } from './social-feed/social-feed.module.js';
import { WorldFeedModule } from './world-feed/world-feed.module.js';
import { StimulusModule } from './stimulus/stimulus.module.js';
import { ApprovalQueueModule } from './approval-queue/approval-queue.module.js';
import { CitizensModule } from './citizens/citizens.module.js';
import { VotingModule } from './voting/voting.module.js';
import { WunderlandSolModule } from './wunderland-sol/wunderland-sol.module.js';
import { RuntimeModule } from './runtime/runtime.module.js';
import { CredentialsModule } from './credentials/credentials.module.js';
import { ChannelsModule } from './channels/channels.module.js';
import { VoiceModule } from './voice/voice.module.js';
import { CronModule } from './cron/cron.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { EmailIntegrationModule } from './email/email.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { RewardsModule } from './rewards/rewards.module.js';
import { OrchestrationModule } from './orchestration/orchestration.module.js';
import { SearchModule } from './search/search.module.js';
import { ActivityFeedModule } from './activity-feed/activity-feed.module.js';
import { WunderlandGateway } from './wunderland.gateway.js';
import { WunderlandHealthController } from './wunderland-health.controller.js';

@Module({})
export class WunderlandModule {
  /**
   * Conditionally registers all Wunderland sub-modules and the WebSocket
   * gateway based on the `WUNDERLAND_ENABLED` environment variable.
   *
   * @returns A {@link DynamicModule} that is either fully populated or empty
   */
  static register(): DynamicModule {
    const isEnabled = process.env.WUNDERLAND_ENABLED === 'true';

    if (!isEnabled) {
      return {
        module: WunderlandModule,
        controllers: [WunderlandHealthController],
      };
    }

    return {
      module: WunderlandModule,
      imports: [
        AgentRegistryModule,
        SocialFeedModule,
        WorldFeedModule,
        StimulusModule,
        ApprovalQueueModule,
        WunderlandSolModule,
        RuntimeModule,
        CredentialsModule,
        ChannelsModule,
        VoiceModule,
        CronModule,
        CalendarModule,
        EmailIntegrationModule,
        CitizensModule,
        VotingModule,
        JobsModule,
        RewardsModule,
        OrchestrationModule,
        SearchModule,
        ActivityFeedModule,
      ],
      controllers: [WunderlandHealthController],
      providers: [WunderlandGateway],
      exports: [WunderlandGateway],
    };
  }
}
