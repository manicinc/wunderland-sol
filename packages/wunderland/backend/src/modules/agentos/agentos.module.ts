/**
 * @file agentos.module.ts
 * @description NestJS module wrapping the AgentOS integration layer.
 *
 * AgentOS is the cognitive runtime that powers AI agent orchestration,
 * tool execution, persona management, and provenance tracking. This module
 * exposes the existing Express-based AgentOS router as NestJS middleware
 * and provides an injectable service for other modules to interact with
 * the AgentOS runtime.
 *
 * The module is always importable, but the middleware and routes are
 * conditionally mounted only when `AGENTOS_ENABLED=true` is set in the
 * environment. When disabled, the controller and middleware are no-ops.
 */

import { Module, type NestModule, type MiddlewareConsumer } from '@nestjs/common';
import { AgentOSController } from './agentos.controller.js';
import { AgentOSNestService } from './agentos.service.js';
import { AgentOSMiddleware } from './agentos.middleware.js';

@Module({
  controllers: [AgentOSController],
  providers: [AgentOSNestService],
  exports: [AgentOSNestService],
})
export class AgentOSModule implements NestModule {
  /**
   * Mounts the AgentOS Express router as middleware on the `agentos` path.
   * Only active when `AGENTOS_ENABLED=true`.
   *
   * @param consumer - NestJS middleware consumer for route binding
   */
  configure(consumer: MiddlewareConsumer): void {
    if (process.env.AGENTOS_ENABLED !== 'true') return;

    consumer.apply(AgentOSMiddleware).forRoutes('agentos');
  }
}
