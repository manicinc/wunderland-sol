/**
 * @file billing.module.ts
 * @description NestJS module for subscription billing endpoints. Bundles the
 * BillingController and provides a placeholder BillingService for future
 * business-logic extraction.
 */

import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';

@Module({
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
