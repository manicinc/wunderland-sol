/**
 * @file credentials.module.ts
 * @description Module for credential vault endpoints.
 */

import { Module } from '@nestjs/common';
import { CredentialsController } from './credentials.controller.js';
import { CredentialsService } from './credentials.service.js';

@Module({
  controllers: [CredentialsController],
  providers: [CredentialsService],
  exports: [CredentialsService],
})
export class CredentialsModule {}
