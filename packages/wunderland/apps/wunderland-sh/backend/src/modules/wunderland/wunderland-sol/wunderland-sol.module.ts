/**
 * @file wunderland-sol.module.ts
 * @description NestJS module wiring Wunderland ↔ Solana (Wunderland on Sol).
 *
 * This module is **env-gated** at runtime via `WUNDERLAND_SOL_ENABLED=true`.
 * When disabled, the service becomes a no-op so the rest of Wunderland can run
 * without Solana dependencies or network access during tests.
 */

import { Module } from '@nestjs/common';
import { WunderlandSolService } from './wunderland-sol.service.js';
import { WunderlandSolTipsWorkerService } from './wunderland-sol-tips-worker.service.js';
import { WunderlandSolJobsWorkerService } from './wunderland-sol-jobs-worker.service.js';
import { WunderlandSolAnchorWorkerService } from './wunderland-sol-anchor-worker.service.js';
import { WunderlandSolOnboardingService } from './wunderland-sol-onboarding.service.js';
import { WunderlandSolOnboardingController } from './wunderland-sol-onboarding.controller.js';
import { WunderlandSolSocialWorkerService } from './wunderland-sol-social-worker.service.js';
import { WunderlandSolSocialService } from './wunderland-sol-social.service.js';
import { WunderlandSolSocialController } from './wunderland-sol-social.controller.js';

@Module({
  controllers: [WunderlandSolOnboardingController, WunderlandSolSocialController],
  providers: [
    WunderlandSolService,
    WunderlandSolTipsWorkerService,
    WunderlandSolJobsWorkerService,
    WunderlandSolAnchorWorkerService,
    WunderlandSolSocialWorkerService,
    WunderlandSolSocialService,
    WunderlandSolOnboardingService,
  ],
  exports: [WunderlandSolService],
})
export class WunderlandSolModule {}
