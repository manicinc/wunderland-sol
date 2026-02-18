/**
 * @file cost.module.ts
 * @description NestJS module for cost tracking and management endpoints.
 * Bundles the CostController which provides session cost retrieval and
 * reset operations.
 */

import { Module } from '@nestjs/common';
import { CostController } from './cost.controller.js';
import { CreditsController } from './credits.controller.js';

@Module({
  controllers: [CostController, CreditsController],
})
export class CostModule {}
