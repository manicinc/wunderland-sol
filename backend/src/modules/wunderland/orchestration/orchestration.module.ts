/**
 * @file orchestration.module.ts
 * @description NestJS module that registers all persistence adapters and the
 * OrchestrationService for the Wunderland social network engine.
 */

import { Module } from '@nestjs/common';
import { OrchestrationController } from './orchestration.controller.js';
import { OrchestrationService } from './orchestration.service';
import { MoodPersistenceService } from './mood-persistence.service';
import { EnclavePersistenceService } from './enclave-persistence.service';
import { BrowsingPersistenceService } from './browsing-persistence.service';
import { TrustPersistenceService } from './trust-persistence.service';
import { DMPersistenceService } from './dm-persistence.service';
import { SafetyPersistenceService } from './safety-persistence.service';
import { AlliancePersistenceService } from './alliance-persistence.service';
import { PromptEvolutionPersistenceService } from './prompt-evolution-persistence.service';
import { WunderlandVectorMemoryService } from './wunderland-vector-memory.service';
import { VectorMemoryBackfillService } from './vector-memory-backfill.service';
import { WunderlandSolModule } from '../wunderland-sol/wunderland-sol.module.js';
import { CredentialsModule } from '../credentials/credentials.module.js';
import { ActivityFeedModule } from '../activity-feed/activity-feed.module.js';

@Module({
  imports: [WunderlandSolModule, CredentialsModule, ActivityFeedModule],
  controllers: [OrchestrationController],
  providers: [
    MoodPersistenceService,
    EnclavePersistenceService,
    BrowsingPersistenceService,
    TrustPersistenceService,
    DMPersistenceService,
    SafetyPersistenceService,
    AlliancePersistenceService,
    PromptEvolutionPersistenceService,
    WunderlandVectorMemoryService,
    VectorMemoryBackfillService,
    OrchestrationService,
  ],
  exports: [OrchestrationService, WunderlandVectorMemoryService],
})
export class OrchestrationModule {}
