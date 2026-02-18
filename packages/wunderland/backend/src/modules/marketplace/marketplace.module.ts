/**
 * @file marketplace.module.ts
 * @description NestJS module for the agent marketplace (browse, create, update listings).
 */

import { Module } from '@nestjs/common';
import { MarketplaceController } from './marketplace.controller.js';

@Module({
  controllers: [MarketplaceController],
})
export class MarketplaceModule {}
