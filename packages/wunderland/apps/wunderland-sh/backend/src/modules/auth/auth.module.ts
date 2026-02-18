/**
 * @file auth.module.ts
 * @description Authentication module providing JWT-based login, registration,
 * and session management endpoints.
 */

import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthNestService } from './auth.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthNestService],
  exports: [AuthNestService],
})
export class AuthModule {}
